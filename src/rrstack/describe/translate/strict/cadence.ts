import type { DescribeConfig } from '../../config';
import type { RuleDescriptorRecur } from '../../descriptor';
import {
  everyWithInterval,
  formatLocalTimeList,
  joinList,
  joinListConj,
  localWeekdayName,
  mergeLexicon,
  monthName,
  ord,
  ordinalsList,
} from './helpers';
import { appendLimits } from './limits';

/**
 * Build the cadence phrase ("every day at 5:00", "in July on the third Tuesday", ...),
 * with limits (date-only and/or count) appended per cfg.limits.
 */
export const buildCadence = (
  d: RuleDescriptorRecur,
  cfg: DescribeConfig = {},
): string => {
  const lex = mergeLexicon(undefined, cfg.lexicon);
  const base = everyWithInterval(lex, d.freq, d.interval);

  // DAILY
  if (d.freq === 'daily') {
    const tm = formatLocalTimeList(
      d.tz,
      d.by.hours,
      d.by.minutes,
      d.by.seconds,
      cfg.time?.timeFormat ?? 'hm',
      cfg.time?.hourCycle ?? 'h23',
    );
    const out = tm ? `${base} at ${tm}` : base;
    return appendLimits(out, d, cfg.limits ?? 'none');
  }

  // WEEKLY (weekday list)
  if (d.freq === 'weekly') {
    if (Array.isArray(d.by.weekdays) && d.by.weekdays.length > 0) {
      const names = d.by.weekdays.map((w) =>
        localWeekdayName(d.tz, w.weekday, cfg.locale, cfg.lowercase),
      );
      const onDays = joinList(names);
      const tm = formatLocalTimeList(
        d.tz,
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        cfg.time?.timeFormat ?? 'hm',
        cfg.time?.hourCycle ?? 'h23',
      );
      const out = `${base} on ${onDays}${tm ? ` at ${tm}` : ''}`;
      return appendLimits(out, d, cfg.limits ?? 'none');
    }
  }

  // YEARLY cases
  if (d.freq === 'yearly') {
    const singleMonth =
      Array.isArray(d.by.months) && d.by.months.length === 1
        ? d.by.months[0]
        : undefined;
    if (singleMonth && singleMonth >= 1 && singleMonth <= 12) {
      const tm = formatLocalTimeList(
        d.tz,
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        cfg.time?.timeFormat ?? 'hm',
        cfg.time?.hourCycle ?? 'h23',
      );
      if (Array.isArray(d.by.monthDays) && d.by.monthDays.length === 1) {
        const dayStr = String(d.by.monthDays[0]);
        const out = `${base} on ${monthName(
          d.tz,
          singleMonth,
          cfg.locale,
          cfg.lowercase,
        )} ${dayStr}${tm ? ` at ${tm}` : ''}`;
        return appendLimits(out, d, cfg.limits ?? 'none');
      }
      if (Array.isArray(d.by.monthDays) && d.by.monthDays.length > 1) {
        const days = d.by.monthDays.filter(
          (n): n is number => typeof n === 'number',
        );
        if (days.length > 0) {
          const ords = ordinalsList(days, cfg.ordinals ?? 'short');
          const out = `${base} in ${monthName(
            d.tz,
            singleMonth,
            cfg.locale,
            cfg.lowercase,
          )} on the ${ords}${tm ? ` at ${tm}` : ''}`;
          return appendLimits(out, d, cfg.limits ?? 'none');
        }
      }
      if (Array.isArray(d.by.weekdays) && d.by.weekdays.length > 0) {
        const names = d.by.weekdays.map((w) =>
          localWeekdayName(d.tz, w.weekday, cfg.locale, cfg.lowercase),
        );
        const setpos = Array.isArray(d.by.setpos)
          ? d.by.setpos.filter((n): n is number => typeof n === 'number')
          : [];
        const nthFromW = d.by.weekdays
          .map((w) => w.nth)
          .filter((n): n is number => typeof n === 'number');
        const nthUnique = Array.from(new Set<number>([...setpos, ...nthFromW]));
        if (nthUnique.length > 0) {
          const nthText = joinListConj(
            nthUnique.map((n) => ord(n, cfg.ordinals ?? 'long')),
            'or',
          );
          const wkText = joinListConj(names, 'or');
          const out = `${base} in ${monthName(
            d.tz,
            singleMonth,
            cfg.locale,
            cfg.lowercase,
          )} on the ${nthText} ${wkText}${tm ? ` at ${tm}` : ''}`;
          return appendLimits(out, d, cfg.limits ?? 'none');
        }
        const onDays = joinList(names);
        const out = `${base} in ${monthName(
          d.tz,
          singleMonth,
          cfg.locale,
          cfg.lowercase,
        )} on ${onDays}${tm ? ` at ${tm}` : ''}`;
        return appendLimits(out, d, cfg.limits ?? 'none');
      }
      {
        const out = `${base} in ${monthName(
          d.tz,
          singleMonth,
          cfg.locale,
          cfg.lowercase,
        )}${tm ? ` at ${tm}` : ''}`;
        return appendLimits(out, d, cfg.limits ?? 'none');
      }
    }
    if (Array.isArray(d.by.months) && d.by.months.length > 1) {
      const months = d.by.months
        .filter(
          (mm): mm is number => typeof mm === 'number' && mm >= 1 && mm <= 12,
        )
        .map((mm) => monthName(d.tz, mm, cfg.locale, cfg.lowercase));
      if (months.length) {
        const inMonthsOr = joinListConj(months, 'or');
        const tm2 = formatLocalTimeList(
          d.tz,
          d.by.hours,
          d.by.minutes,
          d.by.seconds,
          cfg.time?.timeFormat ?? 'hm',
          cfg.time?.hourCycle ?? 'h23',
        );
        // Weekday phrasing within multiple months
        const hasWeekdays =
          Array.isArray(d.by.weekdays) && d.by.weekdays.length > 0;
        if (Array.isArray(d.by.monthDays) && d.by.monthDays.length > 1) {
          const ords = ordinalsList(
            d.by.monthDays.filter((n): n is number => typeof n === 'number'),
            cfg.ordinals ?? 'short',
          );
          const out = `${base} in ${inMonthsOr} on the ${ords}${
            tm2 ? ` at ${tm2}` : ''
          }`;
          return appendLimits(out, d, cfg.limits ?? 'none');
        }
        if (hasWeekdays) {
          const names = d.by.weekdays.map((w) =>
            localWeekdayName(d.tz, w.weekday, cfg.locale, cfg.lowercase),
          );
          const setpos = Array.isArray(d.by.setpos)
            ? d.by.setpos.filter((n): n is number => typeof n === 'number')
            : [];
          const nthFromW = d.by.weekdays
            .map((w) => w.nth)
            .filter((n): n is number => typeof n === 'number');
          const nthUnique = Array.from(
            new Set<number>([...setpos, ...nthFromW]),
          );
          if (nthUnique.length > 0) {
            const nthText = joinListConj(
              nthUnique.map((n) => ord(n, cfg.ordinals ?? 'long')),
              'or',
            );
            const wkText = joinListConj(names, 'or');
            const out = `${base} in ${inMonthsOr} on the ${nthText} ${wkText}${
              tm2 ? ` at ${tm2}` : ''
            }`;
            return appendLimits(out, d, cfg.limits ?? 'none');
          }
          const onDays = joinList(names);
          const out = `${base} in ${inMonthsOr} on ${onDays}${
            tm2 ? ` at ${tm2}` : ''
          }`;
          return appendLimits(out, d, cfg.limits ?? 'none');
        }
        const out = `${base} in ${inMonthsOr}${tm2 ? ` at ${tm2}` : ''}`;
        return appendLimits(out, d, cfg.limits ?? 'none');
      }
    }
    if (Array.isArray(d.by.weekdays) && d.by.weekdays.length > 0) {
      const tm3 = formatLocalTimeList(
        d.tz,
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        cfg.time?.timeFormat ?? 'hm',
        cfg.time?.hourCycle ?? 'h23',
      );
      const names = d.by.weekdays.map((w) =>
        localWeekdayName(d.tz, w.weekday, cfg.locale, cfg.lowercase),
      );
      const setpos = Array.isArray(d.by.setpos)
        ? d.by.setpos.filter((n): n is number => typeof n === 'number')
        : [];
      const nthFromW = d.by.weekdays
        .map((w) => w.nth)
        .filter((n): n is number => typeof n === 'number');
      const nthUnique = Array.from(new Set<number>([...setpos, ...nthFromW]));
      if (nthUnique.length > 0) {
        const nthText = joinListConj(
          nthUnique.map((n) => ord(n, cfg.ordinals ?? 'long')),
          'or',
        );
        const wkText = joinListConj(names, 'or');
        const out = `${base} on the ${nthText} ${wkText}${
          tm3 ? ` at ${tm3}` : ''
        }`;
        return appendLimits(out, d, cfg.limits ?? 'none');
      }
      const onDays = joinList(names);
      const out = `${base} on ${onDays}${tm3 ? ` at ${tm3}` : ''}`;
      return appendLimits(out, d, cfg.limits ?? 'none');
    }
  }

  // MONTHLY (remaining)
  if (d.freq === 'monthly') {
    if (Array.isArray(d.by.monthDays) && d.by.monthDays.length === 1) {
      const dayRaw = d.by.monthDays[0];
      const dayLabel = ord(dayRaw, cfg.ordinals ?? 'short');
      const tm = formatLocalTimeList(
        d.tz,
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        cfg.time?.timeFormat ?? 'hm',
        cfg.time?.hourCycle ?? 'h23',
      );
      const out = `${base} on the ${dayLabel}${tm ? ` at ${tm}` : ''}`;
      return appendLimits(out, d, cfg.limits ?? 'none');
    }
    if (Array.isArray(d.by.monthDays) && d.by.monthDays.length > 1) {
      const ords = ordinalsList(
        d.by.monthDays.filter((n): n is number => typeof n === 'number'),
        cfg.ordinals ?? 'short',
      );
      const tm = formatLocalTimeList(
        d.tz,
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        cfg.time?.timeFormat ?? 'hm',
        cfg.time?.hourCycle ?? 'h23',
      );
      const out = `${base} on the ${ords}${tm ? ` at ${tm}` : ''}`;
      return appendLimits(out, d, cfg.limits ?? 'none');
    }
    if (Array.isArray(d.by.weekdays) && d.by.weekdays.length > 0) {
      const setpos = Array.isArray(d.by.setpos)
        ? d.by.setpos.filter((n): n is number => typeof n === 'number')
        : [];
      const nthFromW = d.by.weekdays
        .map((w) => w.nth)
        .filter((n): n is number => typeof n === 'number');
      const nthUnique = Array.from(new Set<number>([...setpos, ...nthFromW]));
      const names = d.by.weekdays.map((w) =>
        localWeekdayName(d.tz, w.weekday, cfg.locale, cfg.lowercase),
      );
      const tm = formatLocalTimeList(
        d.tz,
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        cfg.time?.timeFormat ?? 'hm',
        cfg.time?.hourCycle ?? 'h23',
      );
      if (nthUnique.length > 0) {
        const nthText = joinListConj(
          nthUnique.map((n) => ord(n, cfg.ordinals ?? 'long')),
          'or',
        );
        const wkText = joinListConj(names, 'or');
        const out = `${base} on the ${nthText} ${wkText}${tm ? ` at ${tm}` : ''}`;
        return appendLimits(out, d, cfg.limits ?? 'none');
      }
      const onDays = joinList(names);
      const out = `${base} on ${onDays}${tm ? ` at ${tm}` : ''}`;
      return appendLimits(out, d, cfg.limits ?? 'none');
    }
  }

  // Fallback
  return appendLimits(base, d, cfg.limits ?? 'none');
};
