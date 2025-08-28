import { DateTime } from 'luxon';
import { RRule } from 'rrule';
import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';
describe('Scenario (America/Chicago): 3-rule cascade (odd months)', () => {
  const tz = 'America/Chicago';

  // Helper to get epoch ms for a local zoned time string (ISO without zone)
  const ms = (isoLocal: string) => DateTime.fromISO(isoLocal, { zone: tz }).toMillis();

  // Temporary: environment-sensitive due to Intl TZ handling; unskip after TZ validation
  // and CI Node/ICU consistency are in place (see dev plan).
  it('applies July blackout except when the day is the 20th (odd months)', () => {
    // Base activation: 3rd Tuesday of odd months, 05:00–06:00
    const base: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        bymonth: [1, 3, 5, 7, 9, 11],
        byweekday: [RRule.TU.nth(3)],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        // Anchor on an actual occurrence so month list advances from it.
        starts: ms('2021-01-19T05:00:00'),
      },
      label: 'base-3rd-tue-oddmonths-05',
    };
    // Blackout July occurrences (same structural criteria, month = 7)
    const julyBlackout: RuleJson = {
      effect: 'blackout',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [7],
        byweekday: [RRule.TU.nth(3)],
        byhour: [5],
        byminute: [0],
        bysecond: [0],        starts: ms('2021-01-01T00:00:00'),
      },
      label: 'blk-july-3rd-tue-05',
    };

    // Re-activate when the day is the 20th (only in July)
    const july20Reactivate: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [7],
        bymonthday: [20],
        byhour: [5],
        byminute: [0],
        bysecond: [0],        starts: ms('2021-01-01T00:00:00'),
      },
      label: 'react-july-20-05',
    };

    // Order matters: later rules override earlier ones at covered instants.
    const stack = new RRStack({
      timezone: tz,
      rules: [base, julyBlackout, july20Reactivate],
    });

    // May 2021 (3rd Tuesday is the 18th) => active
    const may18_0530 = ms('2021-05-18T05:30:00');
    expect(stack.isActiveAt(may18_0530)).toBe(true);

    // A July where 3rd Tuesday is not the 20th => blackout override applies
    const jul18_2023_0530 = ms('2023-07-18T05:30:00');
    expect(stack.isActiveAt(jul18_2023_0530)).toBe(false);

    // 2021-07-20 is 3rd Tuesday AND day 20 => re-activated
    const jul20_2021_0530 = ms('2021-07-20T05:30:00');
    expect(stack.isActiveAt(jul20_2021_0530)).toBe(true);
  });
});