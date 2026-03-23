/**
 * O(1) occurrence resolution for simple sub-daily recurrence rules.
 *
 * "Simple sub-daily" means: SECONDLY, MINUTELY, or HOURLY frequency with no
 * BY* constraints and a fixed (non-calendar) duration. These rules repeat at
 * a constant period in epoch space, so we can resolve occurrences with modular
 * arithmetic instead of iterating from dtstart.
 */

import type { Options as RRuleOptions } from 'rrule';

import type { CompiledEventRule, CompiledRecurRule } from '../compile';
import { Frequency } from '../rrule.runtime';
import type { UnixTimeUnit } from '../types';
import { domainMin, floatingDateToZonedEpoch } from './time';

/**
 * Sub-daily frequency values from the rrule Frequency enum.
 * Used to gate arithmetic resolution.
 */
const SUB_DAILY_FREQS: ReadonlySet<number> = new Set([
  Frequency.SECONDLY,
  Frequency.MINUTELY,
  Frequency.HOURLY,
]);

/** Frequency unit size in the configured unit. Keyed by Frequency enum value. */
const FREQ_UNIT: Record<UnixTimeUnit, Partial<Record<number, number>>> = {
  ms: {
    [Frequency.SECONDLY]: 1_000,
    [Frequency.MINUTELY]: 60_000,
    [Frequency.HOURLY]: 3_600_000,
  },
  s: {
    [Frequency.SECONDLY]: 1,
    [Frequency.MINUTELY]: 60,
    [Frequency.HOURLY]: 3_600,
  },
};

/**
 * BY* option keys from rrule's Options type that disqualify a rule from
 * arithmetic resolution. Derived from `keyof RRuleOptions` to stay in sync
 * with the rrule type definition.
 */
type ByOptionKey = Extract<keyof RRuleOptions, `by${string}`>;

const BY_KEYS: readonly ByOptionKey[] = [
  'bysetpos',
  'bymonth',
  'bymonthday',
  'bynmonthday',
  'byyearday',
  'byweekno',
  'byweekday',
  'bynweekday',
  'byhour',
  'byminute',
  'bysecond',
  'byeaster',
] as const;

/**
 * Check whether rrule options represent a simple sub-daily pattern (no BY*
 * constraints, sub-daily frequency).
 */
const hasNoByConstraints = (options: RRuleOptions): boolean => {
  // Runtime note: our compiled options object is a "shaken" partial,
  // so BY* keys may be omitted (undefined) even though the rrule type
  // declares them as nullable fields.
  const o = options as unknown as Record<string, unknown>;
  for (const key of BY_KEYS) {
    if (o[key] != null) return false;
  }
  return true;
};

const isSubDailyFreq = (freq: number): boolean => SUB_DAILY_FREQS.has(freq);

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
  if (!isSubDailyFreq(rule.options.freq)) return false;
  return hasNoByConstraints(rule.options);
};

/**
 * Whether a compiled event rule qualifies for O(1) arithmetic enumeration.
 * Same frequency/constraint check as isSimpleSubDaily, but without the
 * fixedOffset requirement (events have no duration).
 */
export const isSimpleSubDailyEvent = (rule: CompiledEventRule): boolean => {
  if (!isSubDailyFreq(rule.options.freq)) return false;
  return hasNoByConstraints(rule.options);
};

/**
 * Compute the anchor epoch value for a rule's dtstart.
 * For open-start rules, returns domainMin() (0).
 * For closed-start rules, returns the epoch value of dtstart.
 */
const getAnchor = (rule: {
  isOpenStart: boolean;
  options: RRuleOptions;
  tz: string;
  unit: UnixTimeUnit;
}): number => {
  if (rule.isOpenStart) return domainMin();
  const dtstart = rule.options.dtstart;
  if (dtstart instanceof Date) {
    return floatingDateToZonedEpoch(dtstart, rule.tz, rule.unit);
  }
  return domainMin();
};

/**
 * Compute the period (in the configured unit) between occurrences.
 */
const getPeriod = (rule: {
  options: RRuleOptions;
  unit: UnixTimeUnit;
}): number => {
  const freq = rule.options.freq;
  const freqUnit = FREQ_UNIT[rule.unit][freq];
  if (freqUnit === undefined) {
    throw new Error(
      `Cannot compute period: frequency ${String(freq)} is not sub-daily.`,
    );
  }
  const interval =
    typeof rule.options.interval === 'number' && rule.options.interval > 0
      ? rule.options.interval
      : 1;
  return interval * freqUnit;
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
 * @param rule - A compiled rule (recur or event) that passes the simple
 *              sub-daily check.
 * @param from - Window start (inclusive).
 * @param to - Window end (exclusive).
 */
export const enumerateStartsArithmetic = (
  rule: Pick<
    CompiledRecurRule | CompiledEventRule,
    'isOpenStart' | 'options' | 'tz' | 'unit'
  >,
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
