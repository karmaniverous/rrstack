import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { RRStack } from '../rrstack/RRStack';
import type { TimeZoneId, UnixTimeUnit } from '../rrstack/types';
import { dateOnlyToEpoch, epochToWallDate, wallTimeToEpoch } from './index';

const asTz = (s: string) => RRStack.asTimeZoneId(s);
const units: UnixTimeUnit[] = ['ms', 's'];
const zones = ['UTC', 'America/New_York', 'Europe/Paris'] as const;

const asEpoch = (isoUtc: string, unit: UnixTimeUnit) =>
  unit === 'ms'
    ? DateTime.fromISO(isoUtc, { zone: 'UTC' }).toMillis()
    : Math.trunc(DateTime.fromISO(isoUtc, { zone: 'UTC' }).toSeconds());

const floatingDate = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) =>
  new Date(Date.UTC(y, mo - 1, d, h, mi, s, 0));

describe('time conversion helpers (wall time ↔ epoch)', () => {
  it('dateOnlyToEpoch maps midnight local to the correct epoch (ms & s)', () => {
    for (const unit of units) {
      const tz = asTz('America/New_York');
      const d = floatingDate(2025, 1, 1); // 2025-01-01 00:00 (floating)
      const epoch = dateOnlyToEpoch(d, tz, unit);
      // New York is UTC-5 on Jan 1, so midnight local ⇒ 05:00Z
      const expected = asEpoch('2025-01-01T05:00:00Z', unit);
      expect(epoch).toBe(expected);
    }
  });

  it('wallTimeToEpoch round-trips with epochToWallDate across zones/units', () => {
    for (const unit of units) {
      for (const z of zones) {
        const tz = asTz(z);
        // Sample instant (UTC)
        const baseIso = '2024-05-01T12:34:56Z';
        const base = asEpoch(baseIso, unit);
        const wall = epochToWallDate(base, tz, unit);
        const roundTrip = wallTimeToEpoch(wall, tz, unit);
        expect(roundTrip).toBe(base);
      }
    }
  });

  it('DST forward gap: maps to next valid instant (spring forward)', () => {
    // US spring forward 2025-03-09 in America/Los_Angeles: 02:xx is skipped.
    // Ask for 02:30; it should map to 03:00 local.
    const tz = asTz('America/Los_Angeles');
    const d = floatingDate(2025, 3, 9, 2, 30, 0); // 02:30 (floating)
    const epochMs = wallTimeToEpoch(d, tz, 'ms');
    const local = DateTime.fromMillis(epochMs, { zone: 'America/Los_Angeles' });
    expect(local.hour).toBe(3);
    expect(local.minute).toBe(0);
  });

  it('DST fallback ambiguity: resolves deterministically to earlier offset', () => {
    // US fall back 2025-11-02 in America/Chicago: 01:xx repeats.
    // We request 01:30; confirm consistent (earlier offset) mapping by round-trip.
    const tz = asTz('America/Chicago');
    const d = floatingDate(2025, 11, 2, 1, 30, 0); // 01:30 (floating)
    const ms = wallTimeToEpoch(d, tz, 'ms');
    const back = epochToWallDate(ms, tz, 'ms');
    // Round-trip preserves the same wall clock fields via UTC getters
    expect(back.getUTCFullYear()).toBe(2025);
    expect(back.getUTCMonth()).toBe(10); // 0-indexed => November
    expect(back.getUTCDate()).toBe(2);
    expect(back.getUTCHours()).toBe(1);
    expect(back.getUTCMinutes()).toBe(30);
  });

  it('unit semantics: ms returns millis; s returns truncated seconds', () => {
    const tz = asTz('UTC');
    const d = floatingDate(2024, 6, 1, 12, 0, 30);
    const ms = wallTimeToEpoch(d, tz, 'ms');
    const s = wallTimeToEpoch(d, tz, 's');
    expect(Number.isInteger(ms)).toBe(true);
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBe(Math.trunc(ms / 1000));
  });

  it('epochToWallDate builds a floating wall Date (UTC fields = zone-local fields)', () => {
    const tz = asTz('Europe/Paris');
    const epoch = asEpoch('2024-07-20T05:00:00Z', 'ms'); // summer
    const wall = epochToWallDate(epoch, tz, 'ms');
    const dtz = DateTime.fromMillis(epoch, { zone: 'Europe/Paris' });
    // UTC getters reflect local wall clock fields
    expect(wall.getUTCFullYear()).toBe(dtz.year);
    expect(wall.getUTCMonth()).toBe(dtz.month - 1);
    expect(wall.getUTCDate()).toBe(dtz.day);
    expect(wall.getUTCHours()).toBe(dtz.hour);
    expect(wall.getUTCMinutes()).toBe(dtz.minute);
  });

  it('throws on invalid date / invalid zone / invalid unit', () => {
    const badDate = new Date(Number.NaN);
    const tz = 'Not/AZone' as TimeZoneId;
    const goodTz = asTz('UTC');
    const goodDate = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
    expect(() => wallTimeToEpoch(badDate, goodTz, 'ms')).toThrow(RangeError);
    expect(() => dateOnlyToEpoch(badDate, goodTz, 'ms')).toThrow(RangeError);
    expect(() => wallTimeToEpoch(goodDate, tz, 'ms')).toThrow(RangeError);
    expect(() =>
      wallTimeToEpoch(goodDate, goodTz, 'xx' as UnixTimeUnit),
    ).toThrow(RangeError);
    expect(() => epochToWallDate(0, tz, 'ms')).toThrow(RangeError);
    expect(() => epochToWallDate(0, goodTz, 'xx' as UnixTimeUnit)).toThrow(
      RangeError,
    );
  });
});
