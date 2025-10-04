/**
 * Timezone conversion helpers (wall time ↔ epoch).
 *
 * Public API
 * - wallTimeToEpoch(date, zone, unit): number
 *   Interprets the Date's UTC Y/M/D/H/M/S fields as a wall-clock time in the
 *   supplied IANA zone; returns an epoch in the configured unit.
 *
 * - dateOnlyToEpoch(date, zone, unit): number
 *   Interprets the Date's UTC Y/M/D at 00:00:00 in the supplied zone; returns
 *   an epoch in the configured unit.
 *
 * - epochToWallDate(epoch, zone, unit='ms'): Date
 *   Converts an epoch in unit to a JS Date whose UTC fields reflect the local
 *   time in the supplied zone at that instant ("floating" Date). This shape is
 *   convenient for round-trips with wallTimeToEpoch in UI flows.
 *
 * Validation
 * - If date.getTime() is NaN ⇒ RangeError('Invalid Date')
 * - If zone is not a valid IANA timezone ⇒ RangeError('Invalid time zone')
 * - If unit not 'ms' | 's' ⇒ RangeError('Invalid time unit')
 *
 * DST behavior
 * - Forward jump (skipped hour): mapping is performed by composing midnight
 *   and mapping to the earliest valid instant at/after the requested time.
 * - Backward (ambiguous): resolves to the earlier offset by Luxon defaults.
 */
import { DateTime, IANAZone } from 'luxon';

import { datetime } from '../rrstack/rrule.runtime';
import type { TimeZoneId, UnixTimeUnit } from '../rrstack/types';

const assertValidDate = (d: Date): void => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new RangeError('Invalid Date');
  }
};
const assertValidZone = (z: string): void => {
  if (!IANAZone.isValidZone(z)) {
    throw new RangeError('Invalid time zone');
  }
};
function assertValidUnit(u: string): asserts u is UnixTimeUnit {
  if (u !== 'ms' && u !== 's') {
    throw new RangeError('Invalid time unit');
  }
}

/** Convert Luxon DateTime to epoch in unit (ms|s). */
const toEpoch = (dt: DateTime, unit: UnixTimeUnit): number =>
  unit === 'ms' ? dt.toMillis() : Math.trunc(dt.toSeconds());

/**
 * Compose a DateTime in the local zone at the requested wall time; if invalid
 * (spring-forward gap), map to the earliest valid instant at/after the target.
 * Fall-back ambiguities use Luxon defaults (earlier offset).
 */
const fromWallParts = (
  y: number,
  m: number,
  d: number,
  hh: number,
  mi: number,
  ss: number,
  zone: string,
): DateTime => {
  // First try direct construction at the requested wall time.
  const direct = DateTime.fromObject(
    {
      year: y,
      month: m,
      day: d,
      hour: hh,
      minute: mi,
      second: ss,
      millisecond: 0,
    },
    { zone },
  );
  if (direct.isValid) return direct;

  // If invalid (e.g., inside the DST forward gap), map to the earliest valid
  // instant at/after the requested time. Use minute-level bump to locate the gap end.
  // Anchor at local midnight (or 01:00 as a rare fallback), then add minutes.
  const startOfDay = DateTime.fromObject(
    {
      year: y,
      month: m,
      day: d,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    { zone },
  );
  const base = startOfDay.isValid
    ? startOfDay
    : DateTime.fromObject(
        {
          year: y,
          month: m,
          day: d,
          hour: 1,
          minute: 0,
          second: 0,
          millisecond: 0,
        },
        { zone },
      );

  // Target minutes past midnight; seek to the earliest valid minute ≥ target.
  let candidate = base
    .plus({ minutes: hh * 60 + mi })
    .set({ second: 0, millisecond: 0 });
  let guard = 0;
  while (!candidate.isValid && guard++ < 240) {
    candidate = candidate.plus({ minutes: 1 });
  }
  // Add seconds if representable; otherwise keep the earliest valid minute.
  if (ss > 0) {
    const withSeconds = candidate.plus({ seconds: ss });
    if (withSeconds.isValid) return withSeconds;
  }
  return candidate;
};

/**
 * Interprets a Date's UTC Y/M/D/H/M/S as a wall-clock time in `zone` and
 * returns the epoch in the configured unit.
 *
 * Notes
 * - The Date's UTC fields are used intentionally so a "floating" Date produced
 *   by {@link epochToWallDate} round-trips deterministically.
 */
export const wallTimeToEpoch = (
  date: Date,
  zone: TimeZoneId,
  unit: UnixTimeUnit,
): number => {
  assertValidDate(date);
  assertValidZone(zone as unknown as string);
  assertValidUnit(unit);

  // Read UTC fields to treat the Date as "floating" wall time.
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const hh = date.getUTCHours();
  const mi = date.getUTCMinutes();
  const ss = date.getUTCSeconds();

  const dt = fromWallParts(y, m, d, hh, mi, ss, zone as unknown as string);
  return toEpoch(dt, unit);
};

/**
 * Interprets a Date's UTC Y/M/D at 00:00:00 in `zone` and returns the epoch
 * in the configured unit.
 */
export const dateOnlyToEpoch = (
  date: Date,
  zone: TimeZoneId,
  unit: UnixTimeUnit,
): number => {
  assertValidDate(date);
  assertValidZone(zone as unknown as string);
  assertValidUnit(unit);

  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const dt = fromWallParts(y, m, d, 0, 0, 0, zone as unknown as string);
  return toEpoch(dt, unit);
};

/**
 * Convert an epoch in unit to a JS Date carrying the same local clock fields
 * in `zone` (a "floating" Date). The returned Date's UTC fields (getUTC*)
 * reflect the local time in `zone` at that instant; this shape is convenient
 * for UI round-trips with {@link wallTimeToEpoch}.
 */
export const epochToWallDate = (
  epoch: number,
  zone: TimeZoneId,
  unit: UnixTimeUnit = 'ms',
): Date => {
  assertValidZone(zone as unknown as string);
  assertValidUnit(unit);
  const dt =
    unit === 'ms'
      ? DateTime.fromMillis(epoch, { zone: zone as unknown as string })
      : DateTime.fromSeconds(epoch, { zone: zone as unknown as string });
  // Build a floating Date (UTC fields set to local wall clock fields).
  return datetime(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second);
};

export type { TimeZoneId, UnixTimeUnit };
