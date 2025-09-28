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
    // The month names list is localized/lowercased; expect both month tokens present
    expect(lower).toContain('in january');
    expect(lower).toContain('april');
    expect(lower).toContain('on thursday');
    expect(lower).toContain('5:00');
  });
});
