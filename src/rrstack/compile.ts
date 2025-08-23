/**
 * Requirements addressed:
 * - Compile RuleJson into rrule Options with tzid, dtstart, until clamped to domain.
 * - Validate ISO-8601 duration (positive).
 * - Track open-start/open-end flags.
 * - Keep implementation small/testable; no side effects.
 */

import { DateTime, Duration } from 'luxon';
import { shake } from 'radash';
import { datetime as rruleDatetime,type Options as RRuleOptions, RRule } from 'rrule';

import {
  EPOCH_MAX_MS,
  EPOCH_MIN_MS,
  type instantStatus,
  type RuleJson,
  type RuleOptionsJson,
} from './types';

export interface CompiledRule {
  effect: instantStatus;
  label?: string;
  duration: Duration;
  options: RRuleOptions;
  tz: string;
  isOpenStart: boolean;
  isOpenEnd: boolean;
  rrule: RRule;
}

export const toRRuleOptions = (
  options: RuleOptionsJson,
  timezone: string,
): RRuleOptions => {
  const dtstartMs = Math.max(options.starts ?? EPOCH_MIN_MS, EPOCH_MIN_MS);
  const untilMs = Math.min(options.ends ?? EPOCH_MAX_MS, EPOCH_MAX_MS);

  // Exclude JSON-only fields; keep rrule-native ones.
  const rrLikeRaw: Record<string, unknown> = {
    ...(options as Record<string, unknown>),
  };
  delete rrLikeRaw.starts;
  delete rrLikeRaw.ends;

  // Build wall-clock dtstart/until in the rule timezone for robust enumeration with tzid.
  const s = DateTime.fromMillis(dtstartMs, { zone: timezone });
  const u = DateTime.fromMillis(untilMs, { zone: timezone });
  const dtstartWall = rruleDatetime(s.year, s.month, s.day, s.hour, s.minute, s.second);
  const untilWall = rruleDatetime(u.year, u.month, u.day, u.hour, u.minute, u.second);

  const partial: Partial<RRuleOptions> = {
    ...(rrLikeRaw as Partial<RRuleOptions>),
    tzid: timezone,
    dtstart: dtstartWall,
    until: untilWall,
  };

  return shake(partial) as RRuleOptions;
};

export const compileRule = (
  rule: RuleJson,
  timezone: string,
): CompiledRule => {
  const duration = Duration.fromISO(rule.duration);
  if (!duration.isValid) {
    throw new Error(`Invalid ISO duration: ${rule.duration}`);
  }
  const ms = duration.as('milliseconds');
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new Error(`Duration must be positive: ${rule.duration}`);
  }

  const isOpenStart = rule.options.starts === undefined;
  const isOpenEnd = rule.options.ends === undefined;

  const options = toRRuleOptions(rule.options, timezone);

  const rrule = new RRule(options);

  return {
    effect: rule.effect,
    label: rule.label,
    duration,
    options,
    tz: timezone,
    isOpenStart,
    isOpenEnd,
    rrule,
  };
};
