import { RRule } from 'rrule';
import { describe, expect, it } from 'vitest';

import { describeRule } from './describe';
import type { RuleJson, TimeZoneId } from './types';

describe('rule description: weekday position and time', () => {
  const tz = 'UTC' as unknown as TimeZoneId;

  it('monthly 3rd Tuesday at 05:00 shows "third Tuesday" and "5:00"', () => {
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
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('third');
    expect(lower).toContain('tuesday');
    expect(lower).toContain('5:00');
  });

  it('daily at 09:00 shows the time "9:00"', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [9],
        byminute: [0],
        bysecond: [0],
      },
    };
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('every day');
    expect(lower).toContain('9:00');
  });
});
