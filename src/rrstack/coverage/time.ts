// Requirements addressed:
// - Unit-aware time helpers for ms/s end-to-end operation.
// - Compute occurrence end in the rule timezone (DST-correct).
// - Domain bounds with no EPOCH_* constants.
// - Horizons in the configured unit.

import { DateTime, type Duration, IANAZone } from 'luxon';

import type { CompiledRecurRule } from '../compile';
import { datetime } from '../rrule.runtime';
import type { UnixTimeUnit } from '../types';
export const isValidTimeZone = (tz: string): boolean => IANAZone.isValidZone(tz);
export const domainMin = (): number => 0;
export const domainMax = (unit: UnixTimeUnit): number =>
  unit === 'ms' ? 8_640_000_000_000_000 : 8_640_000_000_000;

export const dayLength = (unit: UnixTimeUnit): number =>
  unit === 'ms' ? 24 * 60 * 60 * 1000 : 24 * 60 * 60;

/**
 * Convert epoch value in the given unit to an rrule "floating" Date
 * representing the same local wall-clock timestamp in the given timezone.
 */
export const epochToWallDate = (value: number, tz: string, unit: UnixTimeUnit): Date => {  const d =
    unit === 'ms'
      ? DateTime.fromMillis(value, { zone: tz })
      : DateTime.fromSeconds(value, { zone: tz });
  return datetime(d.year, d.month, d.day, d.hour, d.minute, d.second);
};
/**
 * Convert a "floating" Date from rrule to an epoch value in the given unit * in the given IANA timezone.
 */
export const floatingDateToZonedEpoch = (d: Date, tz: string, unit: UnixTimeUnit): number => {
  const zdt = DateTime.fromObject(
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
  );
  if (unit === 'ms') return zdt.toMillis();
  // seconds mode: honor [start,end) semantics; consumers ceil end elsewhere
  return Math.trunc(zdt.toSeconds());
};

/**
 * Compute occurrence end in the rule timezone, unit-aware.
 * - In 'ms' mode returns milliseconds.
 * - In 's' mode returns integer seconds and rounds up to honor [start,end).
 */
export const computeOccurrenceEnd = (rule: Pick<CompiledRecurRule, 'unit' | 'tz' | 'duration'>, start: number): number => {
  const startZoned =
    rule.unit === 'ms'
      ? DateTime.fromMillis(start, { zone: rule.tz })
      : DateTime.fromSeconds(start, { zone: rule.tz });
  const endZoned = startZoned.plus(rule.duration);
  if (rule.unit === 'ms') return endZoned.toMillis();
  return Math.ceil(endZoned.toSeconds());
};

/**
 * Conservative horizon policy in the configured unit. * - If duration specifies calendar years: 366 days
 * - If duration specifies calendar months: 32 days
 * - Otherwise: ceil(duration in unit)
 */
export const horizonForDuration = (dur: Duration, unit: UnixTimeUnit): number => {
  const v = dur.toObject();
  if (typeof v.years === 'number' && v.years > 0) return 366 * dayLength(unit);
  if (typeof v.months === 'number' && v.months > 0) return 32 * dayLength(unit);
  const q = unit === 'ms' ? dur.as('milliseconds') : dur.as('seconds');
  return Number.isFinite(q) ? Math.max(0, Math.ceil(q)) : 0;
};
