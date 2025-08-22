/**
 * Requirements addressed:
 * - Determine if a compiled rule covers an instant.
 * - Compute occurrence end using Luxon in the rule timezone (DST-correct).
 * - Enumerate candidate starts impacting a range with a conservative horizon.
 */

import { DateTime } from 'luxon';

import type { CompiledRule } from './compile';

export const computeOccurrenceEndMs = (
  rule: CompiledRule,
  startMs: number,
): number => {
  return DateTime.fromMillis(startMs, { zone: rule.tz })
    .plus(rule.duration)
    .toMillis();
};

export const ruleCoversInstant = (rule: CompiledRule, tMs: number): boolean => {
  const start = rule.rrule.before(new Date(tMs), true);
  if (!start) return false;

  const startMs = start.getTime();
  const endMs = computeOccurrenceEndMs(rule, startMs);
  return startMs <= tMs && tMs < endMs;
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
