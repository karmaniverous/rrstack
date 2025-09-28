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

  it('span with starts/ends includes bounds when includeBounds=true (ms unit)', () => {
    const start = Date.UTC(2025, 3, 1, 0, 0, 0); // 2025-04-01T00:00:00Z
    const end = Date.UTC(2025, 3, 2, 0, 0, 0); // 2025-04-02T00:00:00Z
    const span: RuleJson = {
      effect: 'active',
      // duration omitted for span
      options: { starts: start, ends: end },
    };
    const stack = new RRStack({ timezone: 'UTC', rules: [span] });
    const text = stack.describeRule(0, { includeBounds: true });
    // Base phrasing for spans
    expect(text.toLowerCase()).toContain('active continuously');
    // Bounds should be appended when includeBounds=true
    expect(text).toContain('from 2025-04-01T00:00:00Z');
    expect(text).toContain('until 2025-04-02T00:00:00Z');
  });

  it("span with starts/ends includes bounds when includeBounds=true ('s' unit)", () => {
    const startMs = Date.UTC(2025, 3, 1, 0, 0, 0);
    const endMs = Date.UTC(2025, 3, 2, 0, 0, 0);
    const start = Math.trunc(startMs / 1000);
    const end = Math.trunc(endMs / 1000);
    const span: RuleJson = {
      effect: 'active',
      options: { starts: start, ends: end },
    };
    const stack = new RRStack({
      timezone: 'UTC',
      timeUnit: 's',
      rules: [span],
    });
    const text = stack.describeRule(0, { includeBounds: true });
    expect(text.toLowerCase()).toContain('active continuously');
    // With 's' unit, formatting still yields ISO with Z, derived from seconds
    expect(text).toContain('from 2025-04-01T00:00:00Z');
    expect(text).toContain('until 2025-04-02T00:00:00Z');
  });

  it('throws on out-of-range index', () => {
    const stack = new RRStack({ timezone: 'UTC', rules: [] });
    expect(() => stack.describeRule(0)).toThrow();
  });
});
