import { describe, expect, it } from 'vitest';

import { compileRule } from '../compile';
import { describeCompiledRule, describeRule } from '../describe';
import type { RuleJson, TimeZoneId } from '../types';

describe('rule description helpers', () => {
  const tz = 'UTC' as unknown as TimeZoneId;

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
    const text = describeCompiledRule(compiled, { includeTimeZone: true });
    const lower = text.toLowerCase();
    expect(lower).toContain('active');
    expect(lower).toContain('1 hour 30 minutes');
    // rrule.toText() default English typically includes "every day"
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
      includeTimeZone: true,
      includeBounds: true,
    });
    const lower = text.toLowerCase();
    expect(lower).toContain('active');
    expect(lower).toContain('continuously');
    expect(lower).toContain('from 2024-01-10');
  });

  it('formatTimeZone customizes timezone label (recurring)', () => {
    const text = describeRule(rule, tz, 'ms', {
      includeTimeZone: true,
      formatTimeZone: () => 'FriendlyTZ',
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
      includeTimeZone: true,
      formatTimeZone: () => 'FriendlyTZ',
    });
    expect(text.toLowerCase()).toContain('timezone friendlytz');
  });
});
