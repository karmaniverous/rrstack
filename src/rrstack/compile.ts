/**
 * Requirements addressed:
 * - Compile RuleJson into rrule Options with tzid, dtstart, until.
 * - Validate structured DurationParts (positive total).
 * - Track open-start/open-end flags.
 * - Unit-aware handling (ms/s) with no internal canonicalization.
 */

import { DateTime, Duration } from 'luxon';
import { shake } from 'radash';
import {
  datetime as rruleDatetime,
  Frequency,
  type Options as RRuleOptions,
  RRule,
} from 'rrule';

import { domainMax, domainMin } from './coverage/time';
import {
  type FrequencyStr,
  type instantStatus,
  type RuleJson,
  type RuleOptionsJson,
  type TimeZoneId,
  type UnixTimeUnit,
} from './types';

export interface CompiledRule {
  effect: instantStatus;
  label?: string;
  duration: Duration;
  options: RRuleOptions;
  tz: string;
  unit: UnixTimeUnit;
  isOpenStart: boolean;
  isOpenEnd: boolean;
  rrule: RRule;
}

// Internal mapping from human-readable freq to rrule enum
const FREQ_MAP: Record<FrequencyStr, Frequency> = {
  yearly: Frequency.YEARLY,
  monthly: Frequency.MONTHLY,
  weekly: Frequency.WEEKLY,
  daily: Frequency.DAILY,
  hourly: Frequency.HOURLY,
  minutely: Frequency.MINUTELY,
  secondly: Frequency.SECONDLY,
};

/** @internal */
const toWall = (epoch: number, tz: string, unit: UnixTimeUnit): Date => {
  const d =
    unit === 'ms'
      ? DateTime.fromMillis(epoch, { zone: tz })
      : DateTime.fromSeconds(epoch, { zone: tz });
  return rruleDatetime(d.year, d.month, d.day, d.hour, d.minute, d.second);
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
  rrLikeRaw.freq = FREQ_MAP[options.freq];

  const partial: Partial<RRuleOptions> = {
    ...(rrLikeRaw as Partial<RRuleOptions>),
    tzid: timezone,
  };

  if (typeof options.starts === 'number') {
    partial.dtstart = toWall(options.starts, timezone, unit);
  } else {
    partial.dtstart = toWall(domainMin(), timezone, unit);
  }
  if (typeof options.ends === 'number') {
    partial.until = toWall(options.ends, timezone, unit);
  } else {
    partial.until = toWall(domainMax(unit), timezone, unit);
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
 * @throws If the duration total is non-positive.
 */
export const compileRule = (
  rule: RuleJson,
  timezone: TimeZoneId,
  unit: UnixTimeUnit,
): CompiledRule => {
  const duration = Duration.fromObject(rule.duration);
  const q =
    unit === 'ms' ? duration.as('milliseconds') : duration.as('seconds');
  if (!Number.isFinite(q) || q <= 0) {
    throw new Error('Duration must be strictly positive');
  }

  const isOpenStart = rule.options.starts === undefined;
  const isOpenEnd = rule.options.ends === undefined;

  const options = toRRuleOptions(rule.options, timezone, unit);
  const rrule = new RRule(options);

  return {
    effect: rule.effect,
    label: rule.label,
    duration,
    options,
    tz: timezone,
    unit,
    isOpenStart,
    isOpenEnd,
    rrule,
  };
};
