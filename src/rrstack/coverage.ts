/**
 * Requirements addressed:
 * - Determine if a compiled rule covers an instant.
 * - Compute occurrence end using Luxon in the rule timezone (DST-correct).
 * - Enumerate candidate starts impacting a range with a conservative horizon.
 */

import { DateTime, type Duration } from 'luxon';
import { datetime as rruleDatetime } from 'rrule';

import type { CompiledRule } from './compile';

export const computeOccurrenceEndMs = (
  rule: CompiledRule,
  startMs: number,
): number => {
  return DateTime.fromMillis(startMs, { zone: rule.tz })
    .plus(rule.duration)
    .toMillis();
};

/**
 * Conservative horizon policy:
 * - If duration specifies calendar years: 366 days
 * - If duration specifies calendar months: 32 days
 * - Otherwise: ceil(duration in ms)
 */
export const horizonMsForDuration = (dur: Duration): number => {
  const v = dur.toObject();
  if ((v.years ?? 0) > 0) return 366 * 24 * 60 * 60 * 1000; // 366 days
  if ((v.months ?? 0) > 0) return 32 * 24 * 60 * 60 * 1000; // 32 days
  const ms = dur.as('milliseconds');
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms)) : 0;
};

/**
 * Convert an epoch instant to a "floating" Date representing the same local
 * wall-clock timestamp in the given timezone, for use with rrule.between().
 */
const epochToWallDate = (ms: number, tz: string): Date => {
  const d = DateTime.fromMillis(ms, { zone: tz });
  return rruleDatetime(d.year, d.month, d.day, d.hour, d.minute, d.second);
};

/**
 * Convert a "floating" Date returned by rrule.between() to an epoch instant
 * in the given IANA timezone.
 */
const floatingDateToZonedEpochMs = (d: Date, tz: string): number => {
  return DateTime.fromObject(
    {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      millisecond: d.getUTCMilliseconds(),
    },
    { zone: tz },
  ).toMillis();
};

export const ruleCoversInstant = (rule: CompiledRule, tMs: number): boolean => {
  // Enumerate starts within a conservative window and test coverage.
  // Use wall-clock window boundaries in the rule timezone for robust behavior.
  const horizon = horizonMsForDuration(rule.duration);
  const windowStart = epochToWallDate(tMs - horizon, rule.tz);
  const windowEnd = epochToWallDate(tMs, rule.tz);
  const starts = rule.rrule.between(windowStart, windowEnd, true);

  for (const d of starts) {
    const startMs = floatingDateToZonedEpochMs(d, rule.tz);
    const endMs = computeOccurrenceEndMs(rule, startMs);
    if (startMs <= tMs && tMs < endMs) return true;
  }
  return false;
};

/**
 * Enumerate occurrence starts that may overlap [fromMs, toMs).
 * Includes starts that begin before fromMs but extend into it by subtracting a horizon.
 */
export const enumerateStarts = (
  rule: CompiledRule,
  fromMs: number,
  toMs: number,
  horizonMs: number,
): number[] => {
  const windowStart = epochToWallDate(fromMs - Math.max(0, horizonMs), rule.tz);
  const windowEnd = epochToWallDate(toMs, rule.tz);
  const starts = rule.rrule.between(windowStart, windowEnd, true);
  return starts.map((d) => floatingDateToZonedEpochMs(d, rule.tz));
};
