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
  // WALL instant at/after the requested time. Probe successive wall minutes via
  // DateTime.fromObject (wall construction) rather than adding minutes to a base,
  // which can advance along the real timeline and skip earlier valid wall minutes.
  const targetMinutes = hh * 60 + mi;
  let minuteOffset = 0;
  let minuteCandidate: DateTime | undefined;
  // Limit search to a few hours to avoid degenerate loops; typical DST gaps are 60 minutes.
  while (minuteOffset <= 300) {
    const total = targetMinutes + minuteOffset;
    const ch = Math.floor(total / 60);
    const cm = total % 60;
    // Stop if we exceed same-day hours (defensive; unlikely in practice)
    if (ch > 23) break;
    const dt = DateTime.fromObject(
      {
        year: y,
        month: m,
        day: d,
        hour: ch,
        minute: cm,
        second: 0,
        millisecond: 0,
      },
      { zone },
    );
    if (dt.isValid) {
      minuteCandidate = dt;
      break;
    }
    minuteOffset++;
  }
  // Fall back to direct if nothing found (extremely unlikely)
  if (!minuteCandidate) minuteCandidate = direct;
  // Add seconds if representable as a valid wall instant; otherwise use the minute.
  if (ss > 0) {
    const withSec = DateTime.fromObject(
      {
        year: minuteCandidate.year,
        month: minuteCandidate.month,
        day: minuteCandidate.day,
        hour: minuteCandidate.hour,
        minute: minuteCandidate.minute,
        second: ss,
        millisecond: 0,
      },
      { zone },
    );
    if (withSec.isValid) return withSec;
  }
  return minuteCandidate;
};

/**
 * Interprets a Date's UTC Y/M/D/H/M/S as a wall-clock time in `zone` and
 * returns the epoch in the configured unit.
 *
 * Notes
 * - The Date's UTC fields are used intentionally so a "floating" Date produced
 *   by {@link epochToWallDate} round-trips deterministically.
 *
 * @public
 * @category Time
 * @param date - JS Date whose UTC fields (getUTCFullYear(), getUTCMonth(), etc.)
 *   represent the intended wall-clock Y/M/D/H/M/S in the supplied IANA time zone.
 *   If `date.getTime()` is NaN, a RangeError('Invalid Date') is thrown.
 * @param zone - IANA time zone identifier (branded {@link TimeZoneId}). If not
 *   recognized by the host ICU/Intl data, a RangeError('Invalid time zone') is thrown.
 * @param unit - Target epoch unit: `'ms'` for milliseconds or `'s'` for integer
 *   seconds. Any other value causes RangeError('Invalid time unit').
 * @returns Epoch timestamp in the requested unit. In `'s'` mode, returns
 *   truncated integer seconds (Math.trunc).
 * @throws RangeError - On invalid Date, invalid time zone, or invalid unit.
 * @remarks DST behavior:
 * - Forward jump (skipped hour): invalid wall times map to the earliest valid
 *   instant at/after the requested time in the zone (e.g., 02:30 → 03:00).
 * - Backward (ambiguous): resolves to the earlier offset by Luxon defaults.
 * @example
 * ```ts
 * const tz = RRStack.asTimeZoneId('America/New_York');
 * const wall = new Date(Date.UTC(2025, 0, 1, 9, 0, 0)); // 09:00 (floating)
 * const t = wallTimeToEpoch(wall, tz, 'ms'); // epoch for 2025-01-01 09:00 NY
 * ```
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
 *
 * @public
 * @category Time
 * @param epoch - Epoch timestamp in the provided `unit`.
 * @param zone - IANA time zone identifier (branded {@link TimeZoneId}). Throws
 *   RangeError on invalid zone.
 * @param unit - `'ms'` (default) for milliseconds or `'s'` for integer seconds.
 *   Throws RangeError on invalid value.
 * @returns A "floating" Date whose UTC fields equal the local wall-clock
 *   Y/M/D/H/M/S in `zone` at the provided instant. This is suitable for round-
 *   tripping with {@link wallTimeToEpoch}.
 * @remarks In `'s'` mode, the instant is interpreted as integer seconds since
 *   epoch. DST is handled by Luxon at the instant being converted.
 * @example
 * ```ts
 * const tz = RRStack.asTimeZoneId('Europe/Paris');
 * const wall = epochToWallDate(Date.UTC(2024, 6, 20, 7, 0, 0), tz, 'ms');
 * // wall.getUTCHours() equals the Paris local hour at that instant.
 * const back = wallTimeToEpoch(wall, tz, 'ms'); // round-trip
 * ```
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
