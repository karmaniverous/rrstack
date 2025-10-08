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
      showTimezone: true,
      showBounds: false,
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
    const text = stack.describeRule(0, { showBounds: true });
    // Base phrasing for spans
    expect(text.toLowerCase()).toContain('active continuously');
    // Bounds should be appended when includeBounds=true    expect(text).toContain('from 2025-04-01T00:00:00Z');    expect(text).toContain('until 2025-04-02T00:00:00Z');
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
    const text = stack.describeRule(0, { showBounds: true });
    expect(text.toLowerCase()).toContain('active continuously');
    // With 's' unit, formatting still yields ISO with Z, derived from seconds
    expect(text).toContain('from 2025-04-01T00:00:00Z');
    expect(text).toContain('until 2025-04-02T00:00:00Z');
  });

  it('span with starts/ends respects boundsFormat when includeBounds=true', () => {
    const start = Date.UTC(2025, 3, 1, 0, 0, 0);
    const end = Date.UTC(2025, 3, 2, 0, 0, 0);
    const span: RuleJson = {
      effect: 'active',
      options: { starts: start, ends: end },
    };
    const stack = new RRStack({ timezone: 'UTC', rules: [span] });
    const text = stack.describeRule(0, {
      showBounds: true,
      boundsFormat: 'yyyy-LL-dd HH:mm',
    });
    expect(text).toContain('from 2025-04-01 00:00');
    expect(text).toContain('until 2025-04-02 00:00');
  });
  it('recurring bounds respect boundsFormat when includeBounds=true', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        starts: Date.UTC(2025, 3, 1, 0, 0, 0),
        ends: Date.UTC(2025, 3, 2, 0, 0, 0),
      },
    };
    const stack = new RRStack({ timezone: 'UTC', rules: [rule] });
    const text = stack.describeRule(0, {
      showBounds: true,
      boundsFormat: 'yyyy-LL-dd',
    });
    expect(text).toContain('from 2025-04-01');
    expect(text).toContain('until 2025-04-02');
  });
  it('throws on out-of-range index', () => {
    const stack = new RRStack({ timezone: 'UTC', rules: [] });
    expect(() => stack.describeRule(0)).toThrow();
  });
  it('America/Chicago: daily 1 day with starts clamp renders local midnight bounds', () => {
    // starts = 1759294800000 ms = 2025-10-01T05:00:00Z, which is 00:00 local in America/Chicago (DST active).
    const rule: RuleJson = {
      effect: 'active',
      duration: { days: 1 },
      options: {
        freq: 'daily',
        starts: 1_759_294_800_000,
      },
    };
    const stack = new RRStack({ timezone: 'America/Chicago', rules: [rule] });
    const text = stack.describeRule(0, {
      showBounds: true,
      boundsFormat: 'yyyy-LL-dd HH:mm',
    });
    // Core phrasing
    expect(text).toContain('Active for 1 day every day'); // Bounds should reflect local midnight, not a UTC-based time
    expect(text).toContain('from 2025-10-01 00:00'); // Guard against the incorrect prior value
    expect(text).not.toContain('from 2025-09-30 07:00');
  });

  it('span (Asia/Singapore): includeBounds ISO and date-only formatting', () => {
    // Given data (ms epoch)
    const starts = 1_759_766_400_000; // 2025-10-06T16:00:00Z → 2025-10-07 00:00 +08:00
    const ends = 1_760_112_000_000; // 2025-10-10T16:00:00Z → 2025-10-11 00:00 +08:00
    const span: RuleJson = {
      effect: 'active',
      options: { starts, ends },
    };
    const stack = new RRStack({
      timezone: 'Asia/Singapore',
      rules: [span],
    });

    const iso = stack.describeRule(0, { showBounds: true });
    expect(iso.toLowerCase()).toContain('active continuously');
    expect(iso).toContain('from 2025-10-07T00:00:00+08:00');
    expect(iso).toContain('until 2025-10-11T00:00:00+08:00');
    // With timezone label
    const withTz = stack.describeRule(0, {
      showTimezone: true,
      showBounds: true,
    });
    expect(withTz.toLowerCase()).toContain('timezone asia/singapore');

    // Date-only formatting
    const dOnly = stack.describeRule(0, {
      showBounds: true,
      boundsFormat: 'yyyy-LL-dd',
    });
    expect(dOnly).toContain('from 2025-10-07');
    expect(dOnly).toContain('until 2025-10-11');
  });
});
