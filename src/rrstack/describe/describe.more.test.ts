import { RRule } from 'rrule';
import { describe, expect, it } from 'vitest';

import { describeRule } from '../describe';
import type { RuleJson, TimeZoneId } from '../types';

describe('rule descriptions (extended scenarios)', () => {
  const tz = 'UTC' as unknown as TimeZoneId;

  it('appends COUNT phrasing (“for N occurrences”)', () => {
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
        count: 3,
      },
    };
    const text = describeRule(rule, tz, 'ms');
    expect(text.toLowerCase()).toContain('for 3 occurrence');
  });

  it('appends UNTIL phrasing (“until YYYY-MM-DD”)', () => {
    const until = Date.UTC(2024, 1, 1, 0, 0, 0); // 2024-02-01
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        ends: until,
      },
    };
    const text = describeRule(rule, tz, 'ms');
    expect(text.toLowerCase()).toContain('until 2024-02-01');
  });

  it('yearly with multiple months: “in january, march and july …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [1, 3, 7],
        bymonthday: [5],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('in january, march and july');
    expect(lower).toContain('5:00');
  });

  it('monthly: last weekday phrasing via nth(-1) → “on the last tuesday”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        byweekday: [RRule.TU.nth(-1)],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('on the last tuesday');
    expect(lower).toContain('5:00');
  });

  it('monthly: weekday + BYSETPOS phrasing → “on the third tuesday”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        byweekday: [RRule.TU],
        bysetpos: [3],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('on the third tuesday');
    expect(lower).toContain('5:00');
  });

  it('monthly: BYMONTHDAY phrasing → “on the 15th”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        bymonthday: [15],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('on the 15');
    expect(lower).toContain('5:00');
  });

  it('yearly: single month + weekday (no position) → “in april on thursday ...”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [4],
        byweekday: [RRule.TH],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('in april');
    expect(lower).toContain('on thursday');
    expect(lower).toContain('5:00');
  });

  it('yearly: multiple months + weekday (no position) → “in january, april on thursday ...”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [1, 4],
        byweekday: [RRule.TH],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('in january');
    expect(lower).toContain('april');
    expect(lower).toContain('on thursday');
    expect(lower).toContain('5:00');
  });

  it('daily with multiple times: “at 9:00 and 17:00”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [9, 17],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every day');
    expect(lower).toContain('9:00');
    expect(lower).toContain('17:00');
    expect(lower).toContain(' at ');
  });

  it('monthly with multiple BYMONTHDAY: “on the 1st, 15th and 28th …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { minutes: 30 },
      options: {
        freq: 'monthly',
        bymonthday: [1, 15, 28],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every month');
    expect(lower).toContain('on the 1st');
    expect(lower).toContain('15th');
    expect(lower).toContain('28th');
    expect(lower).toContain('5:00');
  });

  it('yearly (single month) with multiple BYMONTHDAY: “in february on the 2nd and 15th …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [2],
        bymonthday: [2, 15],
        byhour: [6],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('in february');
    expect(lower).toContain('on the 2nd');
    expect(lower).toContain('15th');
    expect(lower).toContain('6:00');
  });

  it('monthly: multiple weekdays with nth → “every month on the third tuesday or wednesday …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        byweekday: [RRule.TU.nth(3), RRule.WE.nth(3)],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every month');
    expect(lower).toContain('on the third tuesday or wednesday');
  });

  it('monthly: multiple weekdays with BYSETPOS → “every month on the third tuesday or wednesday …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        byweekday: [RRule.TU, RRule.WE],
        bysetpos: [3],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every month');
    expect(lower).toContain('on the third tuesday or wednesday');
  });

  it('yearly, single month: multiple weekdays with nth → “every year in july on the third tuesday or wednesday …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [7],
        byweekday: [RRule.TU.nth(3), RRule.WE.nth(3)],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every year in july');
    expect(lower).toContain('on the third tuesday or wednesday');
  });

  it('yearly, single month: multiple weekdays with BYSETPOS → “every year in july on the third tuesday or wednesday …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [7],
        byweekday: [RRule.TU, RRule.WE],
        bysetpos: [3],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every year in july');
    expect(lower).toContain('on the third tuesday or wednesday');
  });

  it('yearly, multiple months + multiple weekdays + BYSETPOS → proper “or” lists for months and weekdays', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [1, 2, 4], // january, february, april
        byweekday: [RRule.TU, RRule.WE, RRule.TH],
        bysetpos: [3], // third
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    // Months use Oxford comma with "or"
    expect(lower).toContain('in january, february, or april');
    // Weekdays use Oxford comma with "or"
    expect(lower).toContain('on the third tuesday, wednesday, or thursday');
  });

  it('yearly, no months: multiple weekdays with nth → “every year on the third tuesday or wednesday …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        byweekday: [RRule.TU.nth(3), RRule.WE.nth(3)],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every year');
    expect(lower).toContain('on the third tuesday or wednesday');
  });

  it('multiple nth for same weekday (monthly): “on the first or third tuesday …”', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        byweekday: [RRule.TU],
        bysetpos: [1, 3],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every month');
    expect(lower).toContain('on the first or third tuesday');
  });
});
