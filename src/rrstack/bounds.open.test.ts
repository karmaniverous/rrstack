import { Frequency } from 'rrule';
import { describe, expect, it } from 'vitest';

import { getEffectiveBounds } from './bounds';
import { compileRule } from './compile';
import type { TimeZoneId } from './types';

describe('bounds: open-sided detection and empty set', () => {
  it('detects open start when coverage begins at domainMin with open start', () => {
    const rule = compileRule(
      {
        effect: 'active',
        duration: { seconds: 120 },
        options: {
          freq: Frequency.DAILY,
          byhour: [0],
          byminute: [0],
          bysecond: [0],
          // starts undefined => open start
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    const b = getEffectiveBounds([rule]);
    expect(b.empty).toBe(false);
    expect(b.start).toBeUndefined(); // open start detected
  });

  it('returns empty=true when no rules present', () => {
    const b = getEffectiveBounds([]);
    expect(b.empty).toBe(true);
    expect(b.start).toBeUndefined();
    expect(b.end).toBeUndefined();
  });
});
