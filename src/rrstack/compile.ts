/**
 * Requirements addressed:
 * - Compile RuleJson into rrule Options with tzid, dtstart, until.
 * - Validate ISO-8601 duration (positive).
 * - Track open-start/open-end flags.
 * - Unit-aware handling (ms/s) with no internal canonicalization.
 */

import { DateTime, Duration } from 'luxon';
import { shake } from 'radash';
import { datetime as rruleDatetime, type Options as RRuleOptions, RRule } from 'rrule';

import {
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

const toWall = (epoch: number, tz: string, unit: UnixTimeUnit): Date => {
  const d =
    unit === 'ms'
      ? DateTime.fromMillis(epoch, { zone: tz })
      : DateTime.fromSeconds(epoch, { zone: tz });
  return rruleDatetime(d.year, d.month, d.day, d.hour, d.minute, d.second);
};

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

  const partial: Partial<RRuleOptions> = {
    ...(rrLikeRaw as Partial<RRuleOptions>),
    tzid: timezone,
  };

  if (typeof options.starts === 'number') {
    partial.dtstart = toWall(options.starts, timezone, unit);
  }
  if (typeof options.ends === 'number') {
    partial.until = toWall(options.ends, timezone, unit);
  }

  return shake(partial) as RRuleOptions;
};

export const compileRule = (
  rule: RuleJson,
  timezone: TimeZoneId,
  unit: UnixTimeUnit,
): CompiledRule => {
  const duration = Duration.fromISO(rule.duration);
  if (!duration.isValid) {
    throw new Error(`Invalid ISO duration: ${rule.duration}`);
  }
  const q = unit === 'ms' ? duration.as('milliseconds') : duration.as('seconds');
  if (!Number.isFinite(q) || q <= 0) {
    throw new Error(`Duration must be positive: ${rule.duration}`);
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
