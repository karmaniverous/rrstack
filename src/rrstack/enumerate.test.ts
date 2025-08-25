import { Frequency } from 'rrule';
import { describe, expect,it } from 'vitest';

import { compileRule } from './compile';
import { enumerateStarts,enumerationHorizon } from './coverage/enumerate';
import type { TimeZoneId } from './types';

describe('coverage/enumerate', () => {
  const tz = 'UTC' as unknown as TimeZoneId;

  it('computes enumeration horizons for yearly, monthly, and duration-based rules', () => {
    const yearly = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: { freq: Frequency.YEARLY, interval: 2, bymonth: [5], bymonthday: [1], byhour: [0], byminute: [0], bysecond: [0] },
      },
      tz,
      'ms',
    );
    const monthly = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: { freq: Frequency.MONTHLY, interval: 3, bymonthday: [1], byhour: [0], byminute: [0], bysecond: [0] },
      },
      tz,
      'ms',
    );
    const daily = compileRule(
      {
        effect: 'active',
        duration: { hours: 3 },
        options: { freq: Frequency.DAILY, byhour: [0], byminute: [0], bysecond: [0] },
      },
      tz,
      'ms',
    );

    const dayMs = 24 * 60 * 60 * 1000;
    expect(enumerationHorizon(yearly)).toBe((366 * 2 + 1) * dayMs);
    expect(enumerationHorizon(monthly)).toBe((32 * 3 + 1) * dayMs);
    expect(enumerationHorizon(daily)).toBe(3 * 60 * 60 * 1000);
  });

  it('enumerates starts within a window extended backward by the horizon', () => {
    const rule = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: { freq: Frequency.DAILY, byhour: [5], byminute: [0], bysecond: [0] },
      },
      tz,
      'ms',
    );

    const jan2 = Date.UTC(2024, 0, 2);
    const from = jan2 + 6 * 60 * 60 * 1000; // 06:00 UTC on Jan 2
    const to = jan2 + 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000; // 06:00 UTC on Jan 3
    const horizon = 2 * 60 * 60 * 1000; // 2 hours back

    const starts = enumerateStarts(rule, from, to, horizon);
    const expected1 = jan2 + 5 * 60 * 60 * 1000; // Jan 2 05:00
    const expected2 = jan2 + 29 * 60 * 60 * 1000; // Jan 3 05:00

    expect(starts).toContain(expected1);
    expect(starts).toContain(expected2);
  });
});
