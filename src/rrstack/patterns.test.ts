import { DateTime } from 'luxon';
import { RRule } from 'rrule';
import { describe, expect, it } from 'vitest';

import { compileRule } from './compile';
import {
  localDayMatchesCommonPatterns,
  localDayMatchesDailyTimes,
} from './coverage/patterns';
import type { RuleJson, TimeZoneId } from './types';

describe('coverage/patterns structural matches', () => {
  it('matches DAILY times on the local day', () => {
    const tz = 'UTC' as TimeZoneId;
    const cr = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
      },
      tz,
      'ms',
    );
    const t = Date.UTC(2024, 0, 2, 5, 30, 0);
    if (cr.kind !== 'recur') throw new Error('expected recurring rule');
    expect(localDayMatchesDailyTimes(cr, t)).toBe(true);
  });
  it('matches MONTHLY 3rd Tuesday at 05:00 in America/Chicago', () => {
    const tz = 'America/Chicago' as TimeZoneId;
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        bysetpos: 3,
        byweekday: [RRule.TU],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const cr = compileRule(rule, tz, 'ms');
    const tTrue = DateTime.fromISO('2021-05-18T05:30:00', {
      zone: 'America/Chicago',
    }).toMillis(); // 3rd Tue
    const tFalse = DateTime.fromISO('2021-05-19T05:30:00', {
      zone: 'America/Chicago',
    }).toMillis(); // Wed
    if (cr.kind !== 'recur') throw new Error('expected recurring rule');
    expect(localDayMatchesCommonPatterns(cr, tTrue)).toBe(true);
    expect(localDayMatchesCommonPatterns(cr, tFalse)).toBe(false);
  });
  it('matches YEARLY bymonth/bymonthday at 05:00 in America/Chicago', () => {
    const tz = 'America/Chicago' as TimeZoneId;
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [7],
        bymonthday: [20],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const cr = compileRule(rule, tz, 'ms');
    const tTrue = DateTime.fromISO('2021-07-20T05:30:00', {
      zone: 'America/Chicago',
    }).toMillis();
    const tFalse = DateTime.fromISO('2021-07-21T05:30:00', {
      zone: 'America/Chicago',
    }).toMillis();
    if (cr.kind !== 'recur') throw new Error('expected recurring rule');
    expect(localDayMatchesCommonPatterns(cr, tTrue)).toBe(true);
    expect(localDayMatchesCommonPatterns(cr, tFalse)).toBe(false);
  });
});
