/**
 * Requirements addressed:
 * - Compile RuleJson into rrule Options with tzid, dtstart, until.
 * - Validate structured DurationParts (positive total).
 * - Track open-start/open-end flags.
 * - Unit-aware handling (ms/s) with no internal canonicalization.
 */

import { DateTime, Duration } from 'luxon';
import { shake } from 'radash';
import type {
  Frequency as RRuleFrequency,
  Options as RRuleOptions,
  RRule as RRuleClass,
} from 'rrule';

import { domainMin } from './coverage/time';
import { datetime, Frequency, RRule } from './rrule.runtime';
import {
  type FrequencyStr,
  type instantStatus,
  type RuleJson,
  type RuleOptionsJson,
  type TimeZoneId,
  type UnixTimeUnit,
} from './types';

export interface CompiledRuleBase {
  effect: instantStatus;
  label?: string;
  tz: string;
  unit: UnixTimeUnit;
  isOpenStart: boolean;
  isOpenEnd: boolean;
}

export interface CompiledRecurRule extends CompiledRuleBase {
  kind: 'recur';
  duration: Duration;
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

export type CompiledRule = CompiledRecurRule | CompiledSpanRule;

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
  rrLikeRaw.freq = FREQ_MAP[options.freq as FrequencyStr];

  const partial: Partial<RRuleOptions> = {
    ...(rrLikeRaw as Partial<RRuleOptions>),
    tzid: timezone,
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

  return shake(partial) as RRuleOptions;
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
  const freqRaw = (rule.options as unknown as { freq?: unknown }).freq;
  const isSpan = freqRaw === undefined;

  if (!isSpan) {    // Recurring rule path
    if (!rule.duration) {
      throw new Error('Recurring rules require a positive duration');
    }    const duration = Duration.fromObject(rule.duration);
    const q =
      unit === 'ms' ? duration.as('milliseconds') : duration.as('seconds');
    if (!Number.isFinite(q) || q <= 0) {
      throw new Error('Duration must be strictly positive');
    }

    const isOpenStart = rule.options.starts === undefined;
    const isOpenEnd = rule.options.ends === undefined;

    const options = toRRuleOptions(rule.options, timezone, unit);
    const r = new RRule(options);

    return {
      kind: 'recur',
      effect: rule.effect,
      label: rule.label,
      duration,
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
  const start =    typeof rule.options.starts === 'number'
      ? (rule.options.starts)
      : undefined;
  const end =
    typeof rule.options.ends === 'number'
      ? (rule.options.ends)
      : undefined;

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
