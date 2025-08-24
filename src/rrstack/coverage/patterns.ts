// Requirements addressed:
// - Local structural matching for DAILY and common MONTHLY/YEARLY patterns.
// - Unit-aware date handling.
// - Reuse computeOccurrenceEnd for DST-correct coverage checks.

import { DateTime } from 'luxon';
import { Frequency, Weekday } from 'rrule';

import type { CompiledRule } from '../compile';
import { computeOccurrenceEnd, floatingDateToZonedEpoch } from './time';

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

export const localDayMatchesDailyTimes = (rule: CompiledRule, t: number): boolean => {
  if (rule.options.freq !== Frequency.DAILY) return false;

  const tz = rule.tz;
  const local =
    rule.unit === 'ms'
      ? DateTime.fromMillis(t, { zone: tz })
      : DateTime.fromSeconds(t, { zone: tz });

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

  let dtstartEpoch = 0;
  if (rule.options.dtstart instanceof Date) {
    dtstartEpoch = floatingDateToZonedEpoch(rule.options.dtstart, tz, rule.unit);
  }

  for (const h of hours) {
    for (const m of minutes) {
      for (const s of seconds) {
        const startLocal =
          (rule.unit === 'ms'
            ? DateTime.fromObject(
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
              ).toMillis()
            : Math.trunc(
                DateTime.fromObject(
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
                ).toSeconds(),
              ));

        if (startLocal < dtstartEpoch) continue;

        const endLocal = computeOccurrenceEnd(rule, startLocal);
        if (startLocal <= t && t < endLocal) return true;
      }
    }
  }

  return false;
};

export const localDayMatchesCommonPatterns = (rule: CompiledRule, t: number): boolean => {
  const { options } = rule;
  const tz = rule.tz;
  const local =
    rule.unit === 'ms'
      ? DateTime.fromMillis(t, { zone: tz })
      : DateTime.fromSeconds(t, { zone: tz });

  const h = Array.isArray(options.byhour) ? options.byhour[0] : undefined;
  const m = Array.isArray(options.byminute) ? options.byminute[0] : 0;
  const s = Array.isArray(options.bysecond) ? options.bysecond[0] : 0;
  if (typeof h !== 'number') return false;

  if (options.freq !== Frequency.MONTHLY && options.freq !== Frequency.YEARLY)
    return false;

  if (options.freq === Frequency.YEARLY && Array.isArray(options.bymonth)) {
    if (!options.bymonth.includes(local.month)) return false;
  }

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

  if (Array.isArray(options.bymonth) && options.bymonth.length > 0) {
    if (!options.bymonth.includes(local.month)) return false;
  }

  if (Array.isArray(options.bymonthday) && options.bymonthday.length > 0) {
    if (!options.bymonthday.includes(local.day)) return false;
  }

  const wd = local.weekday; // 1..7
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
      if (typeof nth === 'number' && nth !== 0)
        return isSameWeekday && weekOrdinal === nth;
      if (typeof pos === 'number') return isSameWeekday && weekOrdinal === pos;
      return isSameWeekday;
    });

    if (!anyMatches) return false;
  }

  const startLocal =
    rule.unit === 'ms'
      ? DateTime.fromObject(
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
        ).toMillis()
      : Math.trunc(
          DateTime.fromObject(
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
          ).toSeconds(),
        );
  const endLocal = computeOccurrenceEnd(rule, startLocal);
  return startLocal <= t && t < endLocal;
};
