/**
 * Requirements addressed:
 * - Determine if a compiled rule covers an instant.
 * - Compute occurrence end using Luxon in the rule timezone (DST-correct).
 * - Enumerate candidate starts impacting a range with a conservative horizon.
 */

import { DateTime, type Duration } from 'luxon';

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

export const ruleCoversInstant = (rule: CompiledRule, tMs: number): boolean => {
  // Enumerate starts within a conservative window and test coverage.
  // This is more robust across environments than relying on rrule.before().
  const horizon = horizonMsForDuration(rule.duration);
  const windowStart = new Date(tMs - horizon);
  const windowEnd = new Date(tMs);
  const starts = rule.rrule.between(windowStart, windowEnd, true);

  for (const d of starts) {
    const startMs = d.getTime();
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
  const windowStart = new Date(fromMs - Math.max(0, horizonMs));
  const windowEnd = new Date(toMs);
  const starts = rule.rrule.between(windowStart, windowEnd, true);
  return starts.map((d) => d.getTime());
};
