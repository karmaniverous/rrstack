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
          freq: 'daily',
          byhour: [0],
          byminute: [0],
          bysecond: [0],
          // starts undefined => open start
        },
      },
      'UTC' as TimeZoneId,
      'ms',
    );
    const b = getEffectiveBounds([rule]);
    expect(b.empty).toBe(false);
    expect(b.start).toBeUndefined(); // open start detected
  }, 40000);
  it('detects open end when coverage extends beyond the probe with open end', () => {
    // Active daily 05:00–06:00, starts clamped but no ends => open end.
    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
    const active = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: {
          freq: 'daily',
          byhour: [5],
          byminute: [0],
          bysecond: [0],
          starts,
        },
      },
      'UTC' as TimeZoneId,
      'ms',
    );
    const b = getEffectiveBounds([active]);
    expect(b.empty).toBe(false);
    expect(b.start).toBe(Date.UTC(2024, 0, 10, 5, 0, 0));
    expect(b.end).toBeUndefined(); // open end detected
  });
  it('returns empty=true when no rules present', () => {
    const b = getEffectiveBounds([]);
    expect(b.empty).toBe(true);
    expect(b.start).toBeUndefined();
    expect(b.end).toBeUndefined();
  }, 40000);
});
