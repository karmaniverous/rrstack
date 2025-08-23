/**
 * Requirements addressed:
 * - Determine if a compiled rule covers an instant.
 * - Compute occurrence end using Luxon in the rule timezone (DST-correct).
 * - Enumerate candidate starts impacting a range with a conservative horizon.
 */

import { DateTime, type Duration } from 'luxon';
import { datetime as rruleDatetime, Frequency, Weekday } from 'rrule';

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
  if (typeof v.years === 'number' && v.years > 0)
    return 366 * 24 * 60 * 60 * 1000; // 366 days
  if (typeof v.months === 'number' && v.months > 0)
    return 32 * 24 * 60 * 60 * 1000; // 32 days
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
  const interval =
    typeof rule.options.interval === 'number' && rule.options.interval > 0
      ? rule.options.interval
      : 1;
  const day = 24 * 60 * 60 * 1000;

  if (freq === Frequency.YEARLY) return (366 * interval + 1) * day;
  if (freq === Frequency.MONTHLY) return (32 * interval + 1) * day;

  const ms = rule.duration.as('milliseconds');
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms)) : 0;
};

type WeekdayLike = number | Weekday;
const normalizeByweekday = (v: unknown): WeekdayLike[] => {
  if (Array.isArray(v)) {
    return v.filter(
      (x): x is WeekdayLike => typeof x === 'number' || x instanceof Weekday,
    );
  }
  if (typeof v === 'number' || v instanceof Weekday) return [v];
  return [];
};

/**
 * Local-day structural fallback for DAILY patterns:
 * When same-day enumeration doesn't yield a covering start, check the day's
 * BYHOUR/BYMINUTE/BYSECOND combinations locally, honoring dtstart.
 */
const localDayMatchesDailyTimes = (
  rule: CompiledRule,
  tMs: number,
): boolean => {
  if (rule.options.freq !== Frequency.DAILY) return false;

  const tz = rule.tz;
  const local = DateTime.fromMillis(tMs, { zone: tz });

  // Extract BY* lists (default minute/second to [0] if omitted).
  const hours = Array.isArray(rule.options.byhour)
    ? rule.options.byhour
    : typeof rule.options.byhour === 'number'
      ? [rule.options.byhour]
      : [];
  if (hours.length === 0) return false;

  const minutes = Array.isArray(rule.options.byminute)
    ? rule.options.byminute
    : typeof rule.options.byminute === 'number'
      ? [rule.options.byminute]
      : [0];

  const seconds = Array.isArray(rule.options.bysecond)
    ? rule.options.bysecond
    : typeof rule.options.bysecond === 'number'
      ? [rule.options.bysecond]
      : [0];

  // Derive dtstart as zoned epoch (compiled rrule option is "floating").
  let dtstartEpoch = 0;
  if (rule.options.dtstart instanceof Date) {
    dtstartEpoch = floatingDateToZonedEpochMs(rule.options.dtstart, tz);
  }

  // Check each combination for same-day coverage, gated by dtstart.
  for (const h of hours) {
    for (const m of minutes) {
      for (const s of seconds) {
        const startLocal = DateTime.fromObject(
          {
            year: local.year,
            month: local.month,
            day: local.day,
            hour: h,
            minute: m,
            second: s,
            millisecond: 0,
          },
          { zone: tz },
        ).toMillis();

        if (startLocal < dtstartEpoch) continue;

        const endLocal = computeOccurrenceEndMs(rule, startLocal);
        if (startLocal <= tMs && tMs < endLocal) return true;
      }
    }
  }

  return false;
};

/**
 * Local-day structural fallback for common monthly/yearly patterns used in our scenarios.
 * Only invoked if coverage was not found via rrule same-day enumeration.
 */
const localDayMatchesCommonPatterns = (
  rule: CompiledRule,
  tMs: number,
): boolean => {
  const { options } = rule;
  const tz = rule.tz;
  const local = DateTime.fromMillis(tMs, { zone: tz });

  // Guard: need a time-of-day to define a start.
  const h = Array.isArray(options.byhour) ? options.byhour[0] : undefined;
  const m = Array.isArray(options.byminute) ? options.byminute[0] : 0;
  const s = Array.isArray(options.bysecond) ? options.bysecond[0] : 0;
  if (typeof h !== 'number') return false;

  // Frequency gating
  if (options.freq !== Frequency.MONTHLY && options.freq !== Frequency.YEARLY)
    return false;

  // YEARLY bymonth check
  if (options.freq === Frequency.YEARLY && Array.isArray(options.bymonth)) {
    if (!options.bymonth.includes(local.month)) return false;
  }

  // MONTHLY interval check (months since dtstart)
  if (options.freq === Frequency.MONTHLY) {
    const interval =
      typeof options.interval === 'number' && options.interval > 0
        ? options.interval
        : 1;
    if (options.dtstart instanceof Date) {
      const start = DateTime.fromJSDate(options.dtstart, { zone: tz }).startOf(
        'month',
      );
      const diffMonths =
        (local.year - start.year) * 12 + (local.month - start.month);
      if (diffMonths < 0 || diffMonths % interval !== 0) return false;
    }
  }

  // bymonth filter (for either freq)
  if (Array.isArray(options.bymonth) && options.bymonth.length > 0) {
    if (!options.bymonth.includes(local.month)) return false;
  }

  // bymonthday (e.g., day 20)
  if (Array.isArray(options.bymonthday) && options.bymonthday.length > 0) {
    if (!options.bymonthday.includes(local.day)) return false;
  }

  // byweekday handling:
  // - Accept Weekday.nth(n) or plain Weekday w/ bysetpos = n.
  const wd = local.weekday; // 1 = Monday .. 7 = Sunday
  const weekOrdinal = Math.floor((local.day - 1) / 7) + 1; // 1..5

  const byweekdayArr = normalizeByweekday(options.byweekday);
  if (byweekdayArr.length > 0) {
    const pos =
      Array.isArray(options.bysetpos) && options.bysetpos.length > 0
        ? options.bysetpos[0]
        : undefined;

    const anyMatches = byweekdayArr.some((w) => {
      const weekdayIndex = typeof w === 'number' ? w : w.weekday;
      const nth = typeof w === 'number' ? undefined : w.n;
      const isSameWeekday = ((weekdayIndex + 1) % 7 || 7) === wd; // map 0..6→1..7
      // Use nth only when it is a non-zero ordinal. When omitted, Weekday.n is 0.
      if (typeof nth === 'number' && nth !== 0)
        return isSameWeekday && weekOrdinal === nth;
      if (typeof pos === 'number') return isSameWeekday && weekOrdinal === pos;
      return isSameWeekday;
    });

    if (!anyMatches) return false;
  }

  const startLocal = DateTime.fromObject(
    {
      year: local.year,
      month: local.month,
      day: local.day,
      hour: h,
      minute: m,
      second: s,
      millisecond: 0,
    },
    { zone: tz },
  ).toMillis();
  const endLocal = computeOccurrenceEndMs(rule, startLocal);
  return startLocal <= tMs && tMs < endLocal;
};

export const ruleCoversInstant = (rule: CompiledRule, tMs: number): boolean => {
  // 0) Day-window enumeration (robust for nth-weekday monthly/yearly patterns).
  // Enumerate all starts occurring on the local calendar day of t (in rule.tz),
  // then test coverage against t.
  {
    const local = DateTime.fromMillis(tMs, { zone: rule.tz });
    const dayStartWall = rruleDatetime(
      local.year,
      local.month,
      local.day,
      0,
      0,
      0,
    );
    const nextDay = local.plus({ days: 1 });
    const dayEndWallExclusive = rruleDatetime(
      nextDay.year,
      nextDay.month,
      nextDay.day,
      0,
      0,
      0,
    );
    const dayStarts = rule.rrule.between(
      dayStartWall,
      dayEndWallExclusive,
      true,
    );
    for (const sd of dayStarts) {
      const candidates = [
        sd.getTime(),
        floatingDateToZonedEpochMs(sd, rule.tz),
      ];
      for (const startMs of candidates) {
        const endMs = computeOccurrenceEndMs(rule, startMs);
        if (startMs <= tMs && tMs < endMs) return true;
      }
    }

    // DAILY fallback: local structural match for BYHOUR/BYMINUTE/BYSECOND patterns
    if (localDayMatchesDailyTimes(rule, tMs)) {
      return true;
    }

    // MONTHLY/YEARLY fallback: structural tz-local match for nth-weekday / bymonthday
    if (localDayMatchesCommonPatterns(rule, tMs)) {
      return true;
    }
  }

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
