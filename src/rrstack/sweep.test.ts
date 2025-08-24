import { Frequency } from 'rrule';
import { describe, expect, it } from 'vitest';

import { compileRule } from './compile';
import { classifyRange, getSegments } from './sweep';
import type { TimeZoneId } from './types';

describe('sweep', () => {
  it('yields cascaded segments with blackout override', () => {
    // Active 05:00–06:00
    const act = compileRule(
      {
        effect: 'active',
        duration: 'PT1H',
        options: { freq: Frequency.DAILY, byhour: [5], byminute: [0], bysecond: [0] },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    // Blackout 05:30–05:45 same day via separate rule
    const blk = compileRule(
      {
        effect: 'blackout',
        duration: 'PT15M',
        options: { freq: Frequency.DAILY, byhour: [5], byminute: [30], bysecond: [0] },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );

    const day = Date.UTC(2024, 0, 2);
    const from = day + 5 * 3600 * 1000;
    const to = day + 6 * 3600 * 1000;

    const segs = [...getSegments([act, blk], from, to)];
    // Expect 05:00-05:30 active, 05:30-05:45 blackout, 05:45-06:00 active
    expect(segs).toEqual([
      { start: from, end: from + 30 * 60 * 1000, status: 'active' },
      { start: from + 30 * 60 * 1000, end: from + 45 * 60 * 1000, status: 'blackout' },
      { start: from + 45 * 60 * 1000, end: to, status: 'active' },
    ]);

    expect(classifyRange([act, blk], from, to)).toBe('partial');
  });
});
