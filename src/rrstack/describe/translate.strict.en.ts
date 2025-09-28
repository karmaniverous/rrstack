import { DateTime } from 'luxon';

import type { RuleDescriptor, RuleDescriptorRecur } from './descriptor';
import { FREQUENCY_LEXICON_EN, type FrequencyLexicon } from './lexicon';

export type OrdinalStyle = 'long' | 'short';

export interface TranslatorOptions {
  frequency?: Partial<FrequencyLexicon>;
  timeFormat?: 'hm' | 'hms' | 'auto';
  hourCycle?: 'h23' | 'h12';
  ordinals?: OrdinalStyle;
  /** Optional BCP‑47 locale for labels (Luxon setLocale). Defaults to runtime locale. */
  locale?: string;
  /** Lowercase labels (strict style). Defaults to true. */
  lowercase?: boolean;
}

export type DescribeTranslator = (
  desc: RuleDescriptor,
  opts?: TranslatorOptions,
) => string;

const ORD_LONG: Partial<Record<number, string>> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  [-1]: 'last',
};
const ORD_SHORT: Partial<Record<number, string>> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
  [-1]: 'last',
};

const joinList = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : items.length === 2
      ? `${items[0]} and ${items[1]}`
      : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const maybeLower = (s: string, lower: boolean | undefined): string =>
  lower === false ? s : s.toLowerCase();

const ord = (n: number, style: OrdinalStyle): string => {
  const dic = style === 'short' ? ORD_SHORT : ORD_LONG;
  return dic[n] ?? `${String(n)}th`;
};

const mergeLexicon = (
  base: FrequencyLexicon,
  over?: Partial<FrequencyLexicon>,
): FrequencyLexicon => {
  if (!over) return base;
  return {
    adjective: { ...base.adjective, ...(over.adjective ?? {}) },
    noun: { ...base.noun, ...(over.noun ?? {}) },
    pluralize: over.pluralize ?? base.pluralize,
  };
};

// Use Luxon to render a local time-of-day string in the rule’s timezone.
const formatLocalTime = (
  tz: string,
  hours?: number[],
  minutes?: number[],
  seconds?: number[],
  tf: 'hm' | 'hms' | 'auto' = 'hm',
  hc: 'h23' | 'h12' = 'h23',
): string | undefined => {
  if (!hours?.length) return undefined;
  const h = hours[0];
  const m = minutes?.[0] ?? 0;
  const s = seconds?.[0] ?? 0;
  const dt = DateTime.fromObject(
    { hour: h, minute: m, second: s, millisecond: 0 },
    { zone: tz },
  );
  const useSeconds = tf === 'hms' || (tf === 'auto' && s > 0);
  if (hc === 'h12') {
    return dt.toFormat(useSeconds ? 'h:mm:ss a' : 'h:mm a');
  }
  // 24-hour, no leading zero for hour
  return dt.toFormat(useSeconds ? 'H:mm:ss' : 'H:mm');
};

// Localized month name in the rule’s timezone (LLLL), lowercased by default.
const monthName = (
  tz: string,
  month: number,
  locale?: string,
  lowercase = true,
): string => {
  let dt = DateTime.fromObject({ year: 2000, month, day: 1 }, { zone: tz });
  if (locale) dt = dt.setLocale(locale);
  const s = dt.toFormat('LLLL');
  return maybeLower(s, lowercase);
};

// Localized weekday name (cccc) from a fixed Monday reference week; 1..7 = Mon..Sun.
const localWeekdayName = (
  tz: string,
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  locale?: string,
  lowercase = true,
): string => {
  // 2020‑11‑02 is a Monday
  let dt = DateTime.fromObject(
    { year: 2020, month: 11, day: 2 },
    { zone: tz },
  ).plus({ days: weekday - 1 });
  if (locale) dt = dt.setLocale(locale);
  return maybeLower(dt.toFormat('cccc'), lowercase);
};

const everyWithInterval = (
  lex: FrequencyLexicon,
  freq: keyof FrequencyLexicon['noun'],
  interval: number,
): string => {
  if (interval === 1) return `every ${lex.noun[freq]}`;
  let pl = lex.pluralize as ((noun: string, n: number) => string) | undefined;
  pl ??= (n, k) => (k === 1 ? n : `${n}s`);
  const plural = pl(lex.noun[freq], interval);
  return `every ${String(interval)} ${plural}`;
};

// Append COUNT / UNTIL phrasing to the produced sentence.
const withCountUntil = (phrase: string, d: RuleDescriptorRecur): string => {
  let out = phrase;
  if (typeof d.count === 'number' && d.count > 0) {
    const c = d.count;
    out += ` for ${String(c)} occurrence${c === 1 ? '' : 's'}`;
  }
  if (typeof d.until === 'number') {
    const ymd =
      d.unit === 'ms'
        ? DateTime.fromMillis(d.until, { zone: d.tz }).toISODate()
        : DateTime.fromSeconds(d.until, { zone: d.tz }).toISODate();
    if (ymd) out += ` until ${ymd}`;
  }
  return out;
};

const phraseRecur = (
  d: RuleDescriptorRecur,
  opts?: TranslatorOptions,
): string => {
  const lex = mergeLexicon(FREQUENCY_LEXICON_EN, opts?.frequency);
  const base = everyWithInterval(lex, d.freq, d.interval);

  // DAILY with time “at …”
  if (d.freq === 'daily') {
    const tm = formatLocalTime(
      d.tz,
      d.by.hours,
      d.by.minutes,
      d.by.seconds,
      opts?.timeFormat ?? 'hm',
      opts?.hourCycle ?? 'h23',
    );
    return withCountUntil(tm ? `${base} at ${tm}` : base, d);
  }

  // WEEKLY: list weekdays “on monday, wednesday and friday”
  if (d.freq === 'weekly') {
    if (Array.isArray(d.by.weekdays) && d.by.weekdays.length > 0) {
      const names = d.by.weekdays.map((w) =>
        localWeekdayName(d.tz, w.weekday, opts?.locale, opts?.lowercase),
      );
      const onDays = joinList(names);
      const tm = formatLocalTime(
        d.tz,
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        opts?.timeFormat ?? 'hm',
        opts?.hourCycle ?? 'h23',
      );
      return withCountUntil(`${base} on ${onDays}${tm ? ` at ${tm}` : ''}`, d);
    }
  }

  // YEARLY:
  // - BYMONTH + BYMONTHDAY => “on july 20”
  // - BYMONTH + (weekday nth or BYSETPOS+weekday) => “in july on the third tuesday”
  // - Multiple months => “in january, march and july …”
  if (d.freq === 'yearly') {
    const m =
      Array.isArray(d.by.months) && d.by.months.length === 1
        ? d.by.months[0]
        : undefined;
    if (m && m >= 1 && m <= 12) {
      const tm = formatLocalTime(
        d.tz,
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        opts?.timeFormat ?? 'hm',
        opts?.hourCycle ?? 'h23',
      );
      if (Array.isArray(d.by.monthDays) && d.by.monthDays.length === 1) {
        const dayStr = String(d.by.monthDays[0]);
        return withCountUntil(
          `${base} on ${monthName(d.tz, m, opts?.locale, opts?.lowercase)} ${dayStr}${tm ? ` at ${tm}` : ''}`,
          d,
        );
      }
      if (Array.isArray(d.by.weekdays) && d.by.weekdays.length === 1) {
        const w = d.by.weekdays[0];
        const nth =
          typeof w.nth === 'number'
            ? w.nth
            : Array.isArray(d.by.setpos) && d.by.setpos.length === 1
              ? d.by.setpos[0]
              : undefined;
        if (typeof nth === 'number') {
          const o = ord(nth, opts?.ordinals ?? 'long');
          const name = localWeekdayName(
            d.tz,
            w.weekday,
            opts?.locale,
            opts?.lowercase,
          );
          return withCountUntil(
            `${base} in ${monthName(d.tz, m, opts?.locale, opts?.lowercase)} on the ${o} ${name}${tm ? ` at ${tm}` : ''}`,
            d,
          );
        }
      }
    }
    if (Array.isArray(d.by.months) && d.by.months.length > 1) {
      const months = d.by.months
        .filter(
          (mm): mm is number => typeof mm === 'number' && mm >= 1 && mm <= 12,
        )
        .map((mm) => monthName(d.tz, mm, opts?.locale, opts?.lowercase));
      if (months.length) {
        const inMonths = joinList(months);
        const tm2 = formatLocalTime(
          d.tz,
          d.by.hours,
          d.by.minutes,
          d.by.seconds,
          opts?.timeFormat ?? 'hm',
          opts?.hourCycle ?? 'h23',
        );
        return withCountUntil(
          `${base} in ${inMonths}${tm2 ? ` at ${tm2}` : ''}`,
          d,
        );
      }
    }
  }

  // MONTHLY: single weekday with ordinal position
  if (d.freq === 'monthly') {
    if (Array.isArray(d.by.weekdays) && d.by.weekdays.length === 1) {
      const w = d.by.weekdays[0];
      let nthVal: number | undefined = undefined;
      if (typeof w.nth === 'number') {
        nthVal = w.nth;
      } else if (Array.isArray(d.by.setpos) && d.by.setpos.length === 1) {
        nthVal = d.by.setpos[0];
      }
      if (typeof nthVal === 'number') {
        const o = ord(nthVal, opts?.ordinals ?? 'long');
        const name = localWeekdayName(
          d.tz,
          w.weekday,
          opts?.locale,
          opts?.lowercase,
        );
        const tm = formatLocalTime(
          d.tz,
          d.by.hours,
          d.by.minutes,
          d.by.seconds,
          opts?.timeFormat ?? 'hm',
          opts?.hourCycle ?? 'h23',
        );
        return withCountUntil(
          `${base} on the ${o} ${name}${tm ? ` at ${tm}` : ''}`,
          d,
        );
      }
    }
  }
  // Fallback: base only (further constraints can be added incrementally)
  return withCountUntil(base, d);
};

export const strictEnTranslator: DescribeTranslator = (
  desc: RuleDescriptor,
  opts?: TranslatorOptions,
): string => {
  if (desc.kind === 'span') return 'continuously';
  return phraseRecur(desc, opts);
};
