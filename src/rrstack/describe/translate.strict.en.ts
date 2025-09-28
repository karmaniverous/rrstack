import { DateTime } from 'luxon';

import type { RuleDescriptor, RuleDescriptorRecur } from './descriptor';
import { FREQUENCY_LEXICON_EN, type FrequencyLexicon } from './lexicon';

export type OrdinalStyle = 'long' | 'short';

export interface TranslatorOptions {
  frequency?: Partial<FrequencyLexicon>;
  timeFormat?: 'hm' | 'hms' | 'auto';
  hourCycle?: 'h23' | 'h12';
  ordinals?: OrdinalStyle;
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
const MONTH_NAME_EN: Record<number, string> = {
  1: 'january',
  2: 'february',
  3: 'march',
  4: 'april',
  5: 'may',
  6: 'june',
  7: 'july',
  8: 'august',
  9: 'september',
  10: 'october',
  11: 'november',
  12: 'december',
};
const joinList = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : items.length === 2
      ? `${items[0]} and ${items[1]}`
      : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const weekdayName = (w: 1 | 2 | 3 | 4 | 5 | 6 | 7): string =>
  [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ][w - 1];

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

const formatTime = (
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
  if (hc === 'h12') {
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = (h % 12 || 12).toString();
    const mm = String(m).padStart(2, '0');
    if (tf === 'hms') {
      const ss = String(s).padStart(2, '0');
      return `${h12}:${mm}:${ss} ${ampm}`;
    }
    return `${h12}:${mm} ${ampm}`;
  }
  const hh = String(h);
  const mm = String(m).padStart(2, '0');
  if (tf === 'hms') {
    const ss = String(s).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}`;
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
    out += ` for ${d.count} occurrence${d.count === 1 ? '' : 's'}`;
  }
  if (typeof d.until === 'number') {
    const ymd =
      d.unit === 'ms'
        ? DateTime.fromMillis(d.until, { zone: d.tz }).toISODate()
        : DateTime.fromSeconds(d.until, { zone: d.tz }).toISODate();
    out += ` until ${ymd}`;
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
    const tm = formatTime(
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
      const names = d.by.weekdays.map((w) => weekdayName(w.weekday));
      const onDays = joinList(names);
      const tm = formatTime(
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
    if (m && MONTH_NAME_EN[m]) {
      const tm = formatTime(
        d.by.hours,
        d.by.minutes,
        d.by.seconds,
        opts?.timeFormat ?? 'hm',
        opts?.hourCycle ?? 'h23',
      );
      if (Array.isArray(d.by.monthDays) && d.by.monthDays.length === 1) {
        return withCountUntil(
          `${base} on ${MONTH_NAME_EN[m]} ${String(d.by.monthDays[0])}${
            tm ? ` at ${tm}` : ''
          }`,
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
          return withCountUntil(
            `${base} in ${MONTH_NAME_EN[m]} on the ${o} ${weekdayName(
              w.weekday,
            )}${tm ? ` at ${tm}` : ''}`,
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
        .map((mm) => MONTH_NAME_EN[mm]);
      if (months.length) {
        const inMonths = joinList(months);
        const tm2 = formatTime(
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
        const name = weekdayName(w.weekday);
        const tm = formatTime(
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
