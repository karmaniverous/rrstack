/**
 * Requirements addressed:
 * - Compile RuleJson into rrule Options with tzid, dtstart, until clamped to domain.
 * - Validate ISO-8601 duration (positive).
 * - Track open-start/open-end flags.
 * - Keep implementation small/testable; no side effects.
 */

import { shake } from 'radash';
import { Duration } from 'luxon';
import { RRule, type Options as RRuleOptions } from 'rrule';

import {
  EPOCH_MAX_MS,
  EPOCH_MIN_MS,
  type RuleJson,
  type RuleOptionsJson,
  type instantStatus,
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

  // Exclude JSON-only fields, keep rrule-native ones, and drop undefined entries.
  const { starts: _s, ends: _e, ...rrLike } = options as Record<string, unknown>;
  const partial: Partial<RRuleOptions> = {
    ...(rrLike as Partial<RRuleOptions>),
    tzid: timezone,
    dtstart: new Date(dtstartMs),
    until: new Date(untilMs),
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
