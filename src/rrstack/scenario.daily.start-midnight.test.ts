import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';
describe('Daily 09:00 starting at midnight (America/Chicago)', () => {
  const tz = 'America/Chicago';
  const ms = (isoLocal: string) => DateTime.fromISO(isoLocal, { zone: tz }).toMillis();

  it('activates at 09:00 on/after the start date even if dtstart is 00:00', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [9],
        byminute: [0],
        bysecond: [0],
        // User convenience: starts at midnight; occurrences begin at 09:00 local.
        starts: ms('2021-05-01T00:00:00'),
      },
      label: 'daily-09-start-midnight',
    };
    const stack = new RRStack({ timezone: tz, rules: [rule] });

    // Before the start date: no activation.
    expect(stack.isActiveAt(ms('2021-04-30T09:30:00'))).toBe(false);

    // On the start date, before 09:00: not yet active.
    expect(stack.isActiveAt(ms('2021-05-01T08:59:59'))).toBe(false);

    // On the start date, within 09:00–10:00: active.
    expect(stack.isActiveAt(ms('2021-05-01T09:30:00'))).toBe(true);

    // On the start date, at or after 10:00: no longer active.
    expect(stack.isActiveAt(ms('2021-05-01T10:00:00'))).toBe(false);

    // Subsequent day at 09:30 should be active as well.
    expect(stack.isActiveAt(ms('2021-05-02T09:30:00'))).toBe(true);
  });
});