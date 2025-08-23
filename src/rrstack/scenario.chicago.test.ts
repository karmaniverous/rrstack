import { DateTime } from 'luxon';
import { Frequency, RRule } from 'rrule';
import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

describe('Scenario (America/Chicago): 3-rule cascade', () => {
  const tz = 'America/Chicago';

  // Helper to get epoch ms for a local zoned time string (ISO without zone)
  const ms = (isoLocal: string) => DateTime.fromISO(isoLocal, { zone: tz }).toMillis();

  it('applies July blackout except when the day is the 20th', () => {
    // Base activation: 3rd Tuesday of every other month, 05:00–06:00
    const base: RuleJson = {
      effect: 'active',
      duration: 'PT1H',
      options: {
        freq: Frequency.MONTHLY,
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
      duration: 'PT1H',
      options: {
        freq: Frequency.YEARLY,
        bymonth: [7],
        byweekday: [RRule.TU.nth(3)],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        starts: ms('2021-01-01T00:00:00'),
      },
      label: 'blk-july-3rd-tue-05',
    };

    // Re-activate when the day is the 20th (only in July)
    const july20Reactivate: RuleJson = {
      effect: 'active',
      duration: 'PT1H',
      options: {
        freq: Frequency.YEARLY,
        bymonth: [7],
        bymonthday: [20],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        starts: ms('2021-01-01T00:00:00'),
      },
      label: 'react-july-20-05',
    };

    // Order matters: later rules override earlier ones at covered instants.
    const stack = new RRStack({
      timezone: tz,
      rules: [base, julyBlackout, july20Reactivate],
    });

    const may18_0530 = ms('2021-05-18T05:30:00');
    expect(stack.isActiveAt(may18_0530)).toBe('active');

    const jul18_2023_0530 = ms('2023-07-18T05:30:00');
    expect(stack.isActiveAt(jul18_2023_0530)).toBe('blackout');

    const jul20_2021_0530 = ms('2021-07-20T05:30:00');
    expect(stack.isActiveAt(jul20_2021_0530)).toBe('active');
  });
});
