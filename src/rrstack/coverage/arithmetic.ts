/**
 * O(1) occurrence resolution for simple sub-daily recurrence rules.
 *
 * "Simple sub-daily" means: SECONDLY, MINUTELY, or HOURLY frequency with no
 * BY* constraints and a fixed (non-calendar) duration. These rules repeat at
 * a constant period in epoch space, so we can resolve occurrences with modular
 * arithmetic instead of iterating from dtstart.
 */

import type { CompiledRecurRule } from '../compile';
import { Frequency } from '../rrule.runtime';
import { domainMin, floatingDateToZonedEpoch } from './time';
import type { UnixTimeUnit } from '../types';

/** Frequency unit size in milliseconds. */
const FREQ_UNIT_MS: Partial<Record<number, number>> = {
  [Frequency.SECONDLY]: 1_000,
  [Frequency.MINUTELY]: 60_000,
  [Frequency.HOURLY]: 3_600_000,
};

/** Frequency unit size in seconds. */
const FREQ_UNIT_S: Partial<Record<number, number>> = {
  [Frequency.SECONDLY]: 1,
  [Frequency.MINUTELY]: 60,
  [Frequency.HOURLY]: 3_600,
};

/** BY* option keys that disqualify a rule from arithmetic resolution. */
const BY_KEYS = [
  'bysetpos',
  'bymonth',
  'bymonthday',
  'byyearday',
  'byweekno',
  'byweekday',
  'byhour',
  'byminute',
  'bysecond',
  'byeaster',
] as const;

const isSimpleSubDailyOptions = (options: Record<string, unknown>): boolean => {
  const freq = options.freq;
  if (
    freq !== Frequency.SECONDLY &&
    freq !== Frequency.MINUTELY &&
    freq !== Frequency.HOURLY
  ) {
    return false;
  }

  for (const key of BY_KEYS) {
    const v = options[key];
    if (v !== undefined && v !== null) return false;
  }

  return true;
};

/**
 * Whether a compiled recur rule qualifies for O(1) arithmetic resolution.
 *
 * Conditions:
 * - Frequency is SECONDLY, MINUTELY, or HOURLY
 * - No BY* options set
 * - fixedOffset is defined (duration has no calendar components)
 */
export const isSimpleSubDaily = (rule: CompiledRecurRule): boolean => {
  if (rule.fixedOffset === undefined) return false;

  // Cast via unknown to avoid TS2352 (rrule Options has no index signature).
  const o = rule.options as unknown as Record<string, unknown>;
  return isSimpleSubDailyOptions(o);
};

/**
 * Whether an event rule qualifies for O(1) arithmetic enumeration.
 * Same as isSimpleSubDaily(), but without the fixedOffset requirement.
 */
export const isSimpleSubDailyEvent = (rule: {
  options: unknown;
}): boolean => {
  const o = rule.options as Record<string, unknown> | null;
  if (!o) return false;
  return isSimpleSubDailyOptions(o);
};

/**
 * Compute the anchor epoch value for a rule's dtstart.
 * For open-start rules, returns domainMin() (0).
 * For closed-start rules, returns the epoch value of dtstart.
 */
const getAnchor = (rule: {
  isOpenStart: boolean;
  options: unknown;
  tz: string;
  unit: UnixTimeUnit;
}): number => {
  if (rule.isOpenStart) return domainMin();
  const options = rule.options as { dtstart?: Date | null } | null;
  const dtstart = options?.dtstart ?? null;
  if (dtstart instanceof Date) {
    return floatingDateToZonedEpoch(dtstart, rule.tz, rule.unit);
  }
  return domainMin();
};

/**
 * Compute the period (in the configured unit) between occurrences.
 */
const getPeriod = (rule: { options: unknown; unit: UnixTimeUnit }): number => {
  const o = rule.options as Record<string, unknown> | null;
  if (!o) return 0;
  
  const freqUnit =
    rule.unit === 'ms'
      ? FREQ_UNIT_MS[o.freq as number]
      : FREQ_UNIT_S[o.freq as number];
  const interval =
    typeof o.interval === 'number' && o.interval > 0
      ? o.interval
      : 1;
  return interval * freqUnit!;
};

/**
 * Find the nearest occurrence start at or before `t` using O(1) modular
 * arithmetic. Returns undefined if the candidate falls before the anchor.
 *
 * @param rule - A compiled recur rule that passes isSimpleSubDaily().
 * @param t - Timestamp in the configured unit.
 */
export const nearestOccurrenceBefore = (
  rule: CompiledRecurRule,
  t: number,
): number | undefined => {
  const anchor = getAnchor(rule);
  if (t < anchor) return undefined;

  const period = getPeriod(rule);
  const offset = (((t - anchor) % period) + period) % period;
  const candidateStart = t - offset;

  return candidateStart >= anchor ? candidateStart : undefined;
};

/**
 * Enumerate all occurrence starts in [from, to) for a simple sub-daily rule
 * using O(1) arithmetic per occurrence.
 *
 * @param rule - A compiled recur rule that passes isSimpleSubDaily().
 * @param from - Window start (inclusive).
 * @param to - Window end (exclusive).
 */
export const enumerateStartsArithmetic = (
  rule: { isOpenStart: boolean; options: unknown; tz: string; unit: UnixTimeUnit },
  from: number,
  to: number,
): number[] => {
  const anchor = getAnchor(rule);
  const period = getPeriod(rule);
  const results: number[] = [];

  // Find first start >= from
  let first: number;
  if (from <= anchor) {
    first = anchor;
  } else {
    const offset = (((from - anchor) % period) + period) % period;
    first = offset === 0 ? from : from + (period - offset);
  }

  for (let s = first; s < to; s += period) {
    results.push(s);
  }

  return results;
};
