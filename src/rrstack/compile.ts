/**
 * Requirements addressed:
 * - Compile RuleJson into rrule Options with tzid, dtstart, until clamped to domain.
 * - Validate ISO-8601 duration (positive).
 * - Track open-start/open-end flags.
 * - Keep implementation small/testable; no side effects.
 */

import { RRule, type Options as RRuleOptions } from 'rrule';
import { Duration } from 'luxon';
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

  const rr: RRuleOptions = {
    // rrule recurrence options (pass-through where provided)
    freq: options.freq,
    interval: options.interval,
    wkst: options.wkst,
    count: options.count,
    bysetpos: options.bysetpos,
    bymonth: options.bymonth,
    bymonthday: options.bymonthday,
    byyearday: options.byyearday,
    byweekno: options.byweekno,
    byweekday: options.byweekday,
    byhour: options.byhour,
    byminute: options.byminute,
    bysecond: options.bysecond,

    // time boundaries
    tzid: timezone,
    dtstart: new Date(dtstartMs),
    until: new Date(untilMs),
  };

  return rr;
};

export const compileRule = (
  rule: RuleJson,
  timezone: string,
): CompiledRule => {
  const duration = Duration.fromISO(rule.duration);
  if (!duration.isValid) {
    throw new Error(`Invalid ISO duration: ${rule.duration}`);
  }
  // Reject non-positive durations; for calendar units, a zero-ish check uses millisecond part and value flags.
  const hasCalUnits =
    (duration.years ?? 0) > 0 ||
    (duration.months ?? 0) > 0 ||
    (duration.weeks ?? 0) > 0 ||
    (duration.days ?? 0) > 0;
  const msOnly = duration.as('milliseconds');
  if (!hasCalUnits && (msOnly === 0 || !isFinite(msOnly) || msOnly < 0)) {
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
