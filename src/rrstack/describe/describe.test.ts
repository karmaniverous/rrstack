import { describe, expect, it } from 'vitest';

import { compileRule } from '../compile';
import { describeCompiledRule, describeRule } from '../describe';
import { RRStack } from '../RRStack';
import type { RuleJson, TimeZoneId } from '../types';

describe('rule description helpers', () => {
  const tz = 'UTC' as TimeZoneId;

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
  it('describeCompiledRule includes effect, duration, and recurrence text', () => {
    const compiled = compileRule(rule, tz, 'ms');
    const text = describeCompiledRule(compiled, { showTimezone: true });
    const lower = text.toLowerCase();
    expect(lower).toContain('active');
    expect(lower).toContain('1 hour 30 minutes'); // rrule.toText() default English typically includes "every day"
    expect(lower).toContain('every day');
    expect(lower).toContain('timezone utc');
  });

  it('describeRule compiles and produces a human-friendly string', () => {
    const text = describeRule(rule, tz, 'ms');
    const lower = text.toLowerCase();
    expect(lower).toContain('active');
    expect(lower).toContain('every day');
  });

  it('describes span rules as continuous with optional bounds', () => {
    const span: RuleJson = {
      effect: 'active',
      // duration omitted
      options: {
        starts: Date.UTC(2024, 0, 10, 5, 0, 0),
        ends: Date.UTC(2024, 0, 12, 7, 0, 0),
      },
    };
    const text = describeRule(span, tz, 'ms', {
      showTimezone: true,
      showBounds: true,
    });
    const lower = text.toLowerCase();
    expect(lower).toContain('active');
    expect(lower).toContain('continuously');
    expect(lower).toContain('from 2024-01-10');
  });

  it('formatTimeZone customizes timezone label (recurring)', () => {
    const text = describeRule(rule, tz, 'ms', {
      showTimezone: true,
      formatTimezoneLabel: () => 'FriendlyTZ',
    });
    const lower = text.toLowerCase();
    expect(lower).toContain('timezone friendlytz');
    // default label should be replaced; presence of friendly label is sufficient
  });

  it('formatTimeZone customizes timezone label (span)', () => {
    const span: RuleJson = {
      effect: 'blackout',
      // duration omitted for span
      options: {
        starts: Date.UTC(2024, 0, 10, 5, 0, 0),
        ends: Date.UTC(2024, 0, 12, 7, 0, 0),
      },
    };
    const text = describeRule(span, tz, 'ms', {
      showTimezone: true,
      formatTimezoneLabel: () => 'FriendlyTZ',
    });
    expect(text.toLowerCase()).toContain('timezone friendlytz');
  });

  it('describeRule helper (span, Asia/Singapore): includeBounds ISO and date-only formatting', () => {
    // Same data as prior stack-based test; verify the pure utility API.
    const starts = 1_759_766_400_000; // 2025-10-06T16:00:00Z → 2025-10-07 00:00 +08:00
    const ends = 1_760_112_000_000; // 2025-10-10T16:00:00Z → 2025-10-11 00:00 +08:00
    const rule: RuleJson = {
      effect: 'active',
      // Span: no freq; duration omitted
      options: { starts, ends },
    };
    const tzId = RRStack.asTimeZoneId('Asia/Singapore');

    // Default ISO bounds (local offset +08:00)
    const iso = describeRule(rule, tzId, 'ms', { showBounds: true });
    expect(iso.toLowerCase()).toContain('active continuously');
    expect(iso).toContain('from 2025-10-07T00:00:00+08:00');
    expect(iso).toContain('until 2025-10-11T00:00:00+08:00');

    // With timezone label
    const withTz = describeRule(rule, tzId, 'ms', {
      showBounds: true,
      showTimezone: true,
    });
    expect(withTz.toLowerCase()).toContain('timezone asia/singapore');

    // Date-only formatting
    const dOnly = describeRule(rule, tzId, 'ms', {
      showBounds: true,
      boundsFormat: 'yyyy-LL-dd HH:mm',
    });
    expect(dOnly).toContain('from 2025-10-07 00:00');
    expect(dOnly).toContain('until 2025-10-11 00:00');
  });
});
