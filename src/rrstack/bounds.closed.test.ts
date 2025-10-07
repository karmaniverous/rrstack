import { describe, expect, it } from 'vitest';

import { getEffectiveBounds } from './bounds';
import { compileRule } from './compile';
import type { TimeZoneId } from './types';

describe('bounds: closed-sided coverage and cascades', () => {
  it('closed-sided single active rule yields correct earliest and latest bounds', () => {
    // Active daily 05:00–06:00 with starts/ends clamped to Jan 10–12 UTC.
    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
    const ends = Date.UTC(2024, 0, 12, 0, 0, 0);

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
          ends,
        },
      },
      'UTC' as TimeZoneId,
      'ms',
    );
    const b = getEffectiveBounds([active]);
    expect(b.empty).toBe(false);
    // First activation at 2024-01-10 05:00
    expect(b.start).toBe(Date.UTC(2024, 0, 10, 5, 0, 0));
    // Last activation ends at 2024-01-11 06:00
    expect(b.end).toBe(Date.UTC(2024, 0, 11, 6, 0, 0));
  });

  it('blackout override reduces latest active bound within the window', () => {
    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
    const ends = Date.UTC(2024, 0, 12, 0, 0, 0);

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
          ends,
        },
      },
      'UTC' as TimeZoneId,
      'ms',
    );

    // Blackout on the 11th at 05:00–06:00 (overrides active on that day only).
    const blackout = compileRule(
      {
        effect: 'blackout',
        duration: { hours: 1 },
        options: {
          freq: 'monthly',
          bymonthday: [11],
          byhour: [5],
          byminute: [0],
          bysecond: [0],
          starts,
          ends,
        },
      },
      'UTC' as TimeZoneId,
      'ms',
    );

    const b = getEffectiveBounds([active, blackout]);
    expect(b.empty).toBe(false);
    // Earliest bound remains the 10th at 05:00.
    expect(b.start).toBe(Date.UTC(2024, 0, 10, 5, 0, 0));
    // Latest bound becomes the end of the 10th activation (06:00), since 11th is blacked out.
    expect(b.end).toBe(Date.UTC(2024, 0, 10, 6, 0, 0));
  });
});
