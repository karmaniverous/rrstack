import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

describe('RRStack.describeRule(index, opts)', () => {
  it('returns a human-readable description for the selected rule', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1, minutes: 30 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const stack = new RRStack({ timezone: 'UTC', rules: [rule] });
    const text = stack.describeRule(0, {
      includeTimeZone: true,
      includeBounds: false,
    });
    const lower = text.toLowerCase();
    expect(lower).toContain('active');
    expect(lower).toContain('1 hour 30 minutes');
    // rrule.toText() typically includes "every day" for DAILY rules
    expect(lower).toContain('every day');
    expect(lower).toContain('timezone utc');
  });

  it('throws on out-of-range index', () => {
    const stack = new RRStack({ timezone: 'UTC', rules: [] });
    expect(() => stack.describeRule(0)).toThrow();
  });
});
