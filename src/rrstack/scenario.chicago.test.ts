import { DateTime } from 'luxon';
import { Frequency, RRule } from 'rrule';
import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

describe('Scenario (America/Chicago): 3-rule cascade (every 2 months)', () => {
  const tz = 'America/Chicago';
  const ms = (isoLocal: string) => DateTime.fromISO(isoLocal, { zone: tz }).toMillis();

  // Keep present but skip until rrule TZ provider is wired robustly
  it('applies July blackout except when the day is the 20th (q2 months)', () => {
    // Base activation: 3rd Tuesday of every other month, 05:00–06:00
    const base: RuleJson = {
      effect: 'active',
      duration: 'PT1H',
      options: {
        freq: Frequency.MONTHLY,
        interval: 2,
        bysetpos: 3,
        byweekday: [RRule.TU],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        // First actual occurrence in cadence (3rd Tuesday Jan 2021 at 05:00)
        // Anchoring to an occurrence ensures interval stepping is aligned.
        starts: ms('2021-01-19T05:00:00'),
      },
      label: 'base-3rd-tue-q2m-05',
    };

    // Blackout July occurrences (same structural criteria, month = 7)
    const julyBlackout: RuleJson = {
      effect: 'blackout',
      duration: 'PT1H',
      options: {
        freq: Frequency.YEARLY,
        bymonth: [7],
        bysetpos: 3,
        byweekday: [RRule.TU],
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

    const stack = new RRStack({
      timezone: tz,
      rules: [base, julyBlackout, july20Reactivate],
    });

    const may18_0530 = ms('2021-05-18T05:30:00');
    expect(stack.isActiveAt(may18_0530)).toBe('active');

    const jul16_2019_0530 = ms('2019-07-16T05:30:00');
    expect(stack.isActiveAt(jul16_2019_0530)).toBe('blackout');

    const jul20_2021_0530 = ms('2021-07-20T05:30:00');
    expect(stack.isActiveAt(jul20_2021_0530)).toBe('active');
  });
});
