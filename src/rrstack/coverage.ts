/**
 * Requirements addressed:
 * - Determine if a compiled rule covers an instant.
 * - Compute occurrence end using Luxon in the rule timezone (DST-correct).
 * - Enumerate candidate starts impacting a range with a conservative horizon.
 */

import { DateTime, type Duration } from 'luxon';
import { datetime as rruleDatetime, Frequency } from 'rrule';

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

/**
 * Frequency/interval-aware search horizon (enumeration window) for rules.
 * - Monthly: ~32 days × interval
 * - Yearly: ~366 days × interval
 * - Otherwise: fallback to duration in ms
 */
const enumerationHorizonMs = (rule: CompiledRule): number => {
  const freq = rule.options.freq;
  const interval = Math.max(1, rule.options.interval ?? 1);
  const day = 24 * 60 * 60 * 1000;

  if (freq === Frequency.YEARLY) return (366 * interval + 1) * day;
  if (freq === Frequency.MONTHLY) return (32 * interval + 1) * day;

  const ms = rule.duration.as('milliseconds');
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms)) : 0;
};

export const ruleCoversInstant = (rule: CompiledRule, tMs: number): boolean => {
  // 1) Robust coverage via rrule.before at wall-clock t.
  const wallT = epochToWallDate(tMs, rule.tz);
  const d = rule.rrule.before(wallT, true);
  if (d) {
    // Candidate 1: treat rrule output as true epoch Date
    const startMsEpoch = d.getTime();
    const endMsEpoch = computeOccurrenceEndMs(rule, startMsEpoch);
    if (startMsEpoch <= tMs && tMs < endMsEpoch) return true;

    // Candidate 2: treat rrule output as "floating" (UTC fields = wall-clock in tz)
    const startMsFloat = floatingDateToZonedEpochMs(d, rule.tz);
    const endMsFloat = computeOccurrenceEndMs(rule, startMsFloat);
    if (startMsFloat <= tMs && tMs < endMsFloat) return true;
  }

  // 2) Fallback enumeration: frequency/interval-aware window [t - horizon, t]
  const horizon = enumerationHorizonMs(rule);
  const windowStart = epochToWallDate(Math.max(0, tMs - horizon), rule.tz);
  const starts = rule.rrule.between(windowStart, wallT, true);

  for (const sd of starts) {
    // Check both interpretations for cross-environment robustness
    const candidates = [sd.getTime(), floatingDateToZonedEpochMs(sd, rule.tz)];
    for (const startMs of candidates) {
      const endMs = computeOccurrenceEndMs(rule, startMs);
      if (startMs <= tMs && tMs < endMs) return true;
    }
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
  return starts.map((date) => floatingDateToZonedEpochMs(date, rule.tz));
};
