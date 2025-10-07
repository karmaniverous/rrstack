import { describe, expect, it } from 'vitest';

import { compileRule } from './compile';
import { getSegments } from './segments';
import type { TimeZoneId } from './types';

describe('segments edge cases', () => {
  it('yields nothing when from === to', () => {
    const rule = compileRule(
      {
        effect: 'active',
        duration: { minutes: 30 },
        options: { freq: 'daily', byhour: [12], byminute: [0], bysecond: [0] },
      },
      'UTC' as TimeZoneId,
      'ms',
    );
    const t = Date.UTC(2024, 0, 2, 12, 0, 0);
    const segs = [...getSegments([rule], t, t)];
    expect(segs.length).toBe(0);
  });
});
