/**
 * Requirements addressed:
 * - Compile RuleJson into rrule Options with tzid, dtstart, until.
 * - Validate structured DurationParts (positive total).
 * - Track open-start/open-end flags.
 * - Unit-aware handling (ms/s) with no internal canonicalization.
 */

import { DateTime, Duration } from 'luxon';
import type {
  Frequency as RRuleFrequency,
  Options as RRuleOptions,
  RRule as RRuleClass,
} from 'rrule';

import { domainMin } from './coverage/time';
import { datetime, Frequency, RRule } from './rrule.runtime';
import {
  type EffectType,
  type FrequencyStr,
  type InstantStatus,
  type RuleJson,
  type RuleOptionsJson,
  type TimeZoneId,
  type UnixTimeUnit,
} from './types';

export interface CompiledRuleBase {
  effect: EffectType;
  label?: string;
  tz: string;
  unit: UnixTimeUnit;
  isOpenStart: boolean;
  isOpenEnd: boolean;
}

export interface CompiledRecurRule extends CompiledRuleBase {
  kind: 'recur';
  duration: Duration;
  /**
   * Pre-computed fixed offset in the configured unit, or undefined if the
   * duration contains calendar components (days/months/years) that require
   * DST-aware arithmetic.
   */
  fixedOffset: number | undefined;
  options: RRuleOptions;
  rrule: RRuleClass;
}

export interface CompiledSpanRule extends CompiledRuleBase {
  kind: 'span';
  /** Start clamp in configured unit (inclusive) */
  start?: number;
  /** End clamp in configured unit (exclusive) */
  end?: number;
}

export interface CompiledEventRule extends CompiledRuleBase {
  kind: 'event';
  options: RRuleOptions;
  rrule: RRuleClass;
}

export interface CompiledOneTimeEventRule extends CompiledRuleBase {
  kind: 'oneTimeEvent';
  /** Event instant in the configured unit. */
  at: number;
}

export type CompiledAnyEventRule = CompiledEventRule | CompiledOneTimeEventRule;

export type CompiledRule =
  | CompiledRecurRule
  | CompiledSpanRule
  | CompiledEventRule
  | CompiledOneTimeEventRule;
/** Coverage-only rules (excludes events). Effect is always 'active' | 'blackout'. */
export type CompiledCoverageRule = (CompiledRecurRule | CompiledSpanRule) & {
  effect: InstantStatus;
};

// Internal mapping from human-readable freq to rrule enum
const FREQ_MAP: Record<FrequencyStr, RRuleFrequency> = {
  yearly: Frequency.YEARLY,
  monthly: Frequency.MONTHLY,
  weekly: Frequency.WEEKLY,
  daily: Frequency.DAILY,
  hourly: Frequency.HOURLY,
  minutely: Frequency.MINUTELY,
  secondly: Frequency.SECONDLY,
} as const;

/** @internal */
const toWall = (epoch: number, tz: string, unit: UnixTimeUnit): Date => {
  const d =
    unit === 'ms'
      ? DateTime.fromMillis(epoch, { zone: tz })
      : DateTime.fromSeconds(epoch, { zone: tz });
  // rrule expects a UTC-floating Date carrying wall parts for `tz`.
  return datetime(d.year, d.month, d.day, d.hour, d.minute, d.second);
};
/**
 * Convert a JSON-friendly rule options object into rrule Options with
 * timezone and domain bounds applied.
 *
 * @param options - JSON rule options (freq required; dtstart/until/tzid omitted).
 * @param timezone - IANA timezone id.
 * @param unit - Time unit ('ms' | 's') used to interpret starts/ends.
 * @returns An rrule Options object suitable for {@link RRule}.
 * @remarks
 * - `dtstart` and `until` are synthesized from `starts`/`ends` or domain bounds.
 * - `tzid` is set to the provided timezone.
 * - RRULE `until` is inclusive of the last start at that instant. When you pass
 *   a JSON `ends`, RRStack maps it to RRULE `until` with this inclusive behavior.
 *   Intervals computed by RRStack remain half‑open `[start, end)` and in `'s'`
 *   mode ends are rounded up to the next integer second.
 */
export const toRRuleOptions = (
  options: RuleOptionsJson,
  timezone: string,
  unit: UnixTimeUnit,
): RRuleOptions => {
  const rrLikeRaw: Record<string, unknown> = {
    ...(options as Record<string, unknown>),
  };
  delete rrLikeRaw.starts;
  delete rrLikeRaw.ends;
  // Map human-readable freq → rrule numeric enum
  rrLikeRaw.freq = FREQ_MAP[options.freq!];

  const partial: Partial<RRuleOptions> = {
    ...(rrLikeRaw as Partial<RRuleOptions>),
    // Intentionally omit 'tzid' so rrule operates in floating-wall mode.
    // We handle all timezone math externally via Luxon to avoid host/tz drift.
  };

  if (typeof options.starts === 'number') {
    partial.dtstart = toWall(options.starts, timezone, unit);
  } else {
    // Preserve previous behavior: open start defaults to domainMin()
    // to anchor cadence deterministically.
    partial.dtstart = toWall(domainMin(), timezone, unit);
  }
  if (typeof options.ends === 'number') {
    // Only set 'until' when explicitly provided to avoid invalid far-future dates.
    partial.until = toWall(options.ends, timezone, unit);
  }

  // Normalize: set all expected RRuleOptions keys to their defaults when
  // absent, so the compiled object conforms to the full Options shape
  // without requiring downstream consumers to cast through unknown.
  return {
    freq: partial.freq!,
    dtstart: partial.dtstart ?? null,
    interval: partial.interval ?? 1,
    wkst: partial.wkst ?? null,
    count: partial.count ?? null,
    until: partial.until ?? null,
    tzid: partial.tzid ?? null,
    bysetpos: partial.bysetpos ?? null,
    bymonth: partial.bymonth ?? null,
    bymonthday: partial.bymonthday ?? null,
    bynmonthday: partial.bynmonthday ?? null,
    byyearday: partial.byyearday ?? null,
    byweekno: partial.byweekno ?? null,
    byweekday: partial.byweekday ?? null,
    bynweekday: partial.bynweekday ?? null,
    byhour: partial.byhour ?? null,
    byminute: partial.byminute ?? null,
    bysecond: partial.bysecond ?? null,
    byeaster: partial.byeaster ?? null,
  } satisfies RRuleOptions;
};
/**
 * Compile a JSON rule into a unit- and timezone-aware {@link CompiledRule}.
 *
 * @param rule - The JSON rule (effect, duration parts, options, optional label).
 * @param timezone - IANA timezone id for coverage computation.
 * @param unit - Time unit ('ms' | 's'). Affects duration arithmetic and
 *               rounding behavior of occurrence ends.
 * @throws If the rule violates recurrence/span constraints.
 */
export const compileRule = (
  rule: RuleJson,
  timezone: TimeZoneId,
  unit: UnixTimeUnit,
): CompiledRule => {
  const freqRaw = (rule.options as { freq?: unknown }).freq;
  const isSpan = freqRaw === undefined;

  // Event rule path: effect is 'event'
  if (rule.effect === 'event') {
    if (rule.duration) {
      throw new Error('Event rules must not have a duration');
    }
    if (isSpan) {
      // One-time event: no freq, must have starts
      if (typeof rule.options.starts !== 'number') {
        throw new Error('One-time event rules must have a starts timestamp');
      }
      return {
        kind: 'oneTimeEvent' as const,
        effect: 'event' as const,
        label: rule.label,
        tz: timezone,
        unit,
        isOpenStart: false,
        isOpenEnd: rule.options.ends === undefined,
        at: rule.options.starts,
      };
    }
    const isOpenStart = rule.options.starts === undefined;
    const isOpenEnd = rule.options.ends === undefined;
    const options = toRRuleOptions(rule.options, timezone, unit);
    const r = new RRule(options);
    return {
      kind: 'event' as const,
      effect: 'event' as const,
      label: rule.label,
      tz: timezone,
      unit,
      isOpenStart,
      isOpenEnd,
      options,
      rrule: r,
    };
  }

  if (!isSpan) {
    // Recurring rule path
    if (!rule.duration) {
      throw new Error('Recurring rules require a positive duration');
    }
    const duration = Duration.fromObject(rule.duration);
    const q =
      unit === 'ms' ? duration.as('milliseconds') : duration.as('seconds');
    if (!Number.isFinite(q) || q <= 0) {
      throw new Error('Duration must be strictly positive');
    }

    const isOpenStart = rule.options.starts === undefined;
    const isOpenEnd = rule.options.ends === undefined;

    const options = toRRuleOptions(rule.options, timezone, unit);
    const r = new RRule(options);

    // Pre-compute fixed offset for durations with no calendar components.
    const dObj = rule.duration;
    const hasCalendar =
      (dObj.days !== undefined && dObj.days > 0) ||
      (dObj.weeks !== undefined && dObj.weeks > 0) ||
      (dObj.months !== undefined && dObj.months > 0) ||
      (dObj.years !== undefined && dObj.years > 0);
    const fixedOffset = hasCalendar
      ? undefined
      : unit === 'ms'
        ? duration.as('milliseconds')
        : duration.as('seconds');

    return {
      kind: 'recur',
      effect: rule.effect,
      label: rule.label,
      duration,
      fixedOffset,
      options,
      tz: timezone,
      unit,
      isOpenStart,
      isOpenEnd,
      rrule: r,
    };
  }

  if (rule.duration) {
    throw new Error('Span rules must omit duration');
  }
  const start =
    typeof rule.options.starts === 'number' ? rule.options.starts : undefined;
  const end =
    typeof rule.options.ends === 'number' ? rule.options.ends : undefined;

  const isOpenStart = start === undefined;
  const isOpenEnd = end === undefined;

  const span: CompiledSpanRule = {
    kind: 'span',
    effect: rule.effect,
    label: rule.label,
    tz: timezone,
    unit,
    isOpenStart,
    isOpenEnd,
    start,
    end,
  };
  return span;
};
