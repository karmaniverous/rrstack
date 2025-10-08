import { DateTime } from 'luxon';

import type { DurationParts } from '../../../types';
import type { FrequencyLexicon } from '../../lexicon';
import { FREQUENCY_LEXICON_EN } from '../../lexicon';

export type OrdinalStyle = 'long' | 'short';

export const ORD_LONG: Partial<Record<number, string>> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  [-1]: 'last',
};
export const ORD_SHORT: Partial<Record<number, string>> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
  [-1]: 'last',
};

export const ord = (n: number, style: OrdinalStyle): string => {
  const dic = style === 'short' ? ORD_SHORT : ORD_LONG;
  return dic[n] ?? `${String(n)}th`;
};

export const joinList = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : items.length === 2
      ? `${items[0]} and ${items[1]}`
      : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

export const joinListConj = (
  items: string[],
  conj: 'and' | 'or' = 'and',
): string => {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  const tail = items[items.length - 1] ?? '';
  return `${head}, ${conj} ${tail}`;
};

export const maybeLower = (s: string, lower: boolean | undefined): string =>
  lower === false ? s : s.toLowerCase();

export const mergeLexicon = (
  base: FrequencyLexicon = FREQUENCY_LEXICON_EN,
  over?: Partial<FrequencyLexicon>,
): FrequencyLexicon => {
  if (!over) return base;
  return {
    adjective: { ...base.adjective, ...(over.adjective ?? {}) },
    noun: { ...base.noun, ...(over.noun ?? {}) },
    pluralize: over.pluralize ?? base.pluralize,
  };
};

export const monthName = (
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

export const localWeekdayName = (
  tz: string,
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  locale?: string,
  lowercase = true,
): string => {
  // 2020-11-02 is Monday
  let dt = DateTime.fromObject(
    { year: 2020, month: 11, day: 2 },
    { zone: tz },
  ).plus({ days: weekday - 1 });
  if (locale) dt = dt.setLocale(locale);
  return maybeLower(dt.toFormat('cccc'), lowercase);
};

export const formatLocalTime = (
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
  if (hc === 'h12') return dt.toFormat(useSeconds ? 'h:mm:ss a' : 'h:mm a');
  return dt.toFormat(useSeconds ? 'H:mm:ss' : 'H:mm');
};

export const formatLocalTimeList = (
  tz: string,
  hours?: number[],
  minutes?: number[],
  seconds?: number[],
  tf: 'hm' | 'hms' | 'auto' = 'hm',
  hc: 'h23' | 'h12' = 'h23',
): string | undefined => {
  const hs = Array.isArray(hours)
    ? hours
    : typeof hours === 'number'
      ? [hours]
      : [];
  const ms = Array.isArray(minutes)
    ? minutes
    : typeof minutes === 'number'
      ? [minutes]
      : [];
  const ss = Array.isArray(seconds)
    ? seconds
    : typeof seconds === 'number'
      ? [seconds]
      : [];
  const m = ms.length > 0 ? ms[0] : 0;
  const s = ss.length > 0 ? ss[0] : 0;

  if (hs.length > 1 && ms.length <= 1 && ss.length <= 1) {
    const parts = hs
      .map((h) => formatLocalTime(tz, [h], [m], [s], tf, hc)!)
      .filter(Boolean);
    return parts.length ? joinList(parts) : undefined;
  }
  if (hs.length === 1 && ms.length > 1 && ss.length <= 1) {
    const parts = ms
      .map((mm) => formatLocalTime(tz, [hs[0]], [mm], [s], tf, hc)!)
      .filter(Boolean);
    return parts.length ? joinList(parts) : undefined;
  }
  return formatLocalTime(tz, hs, ms, ss, tf, hc);
};

export const everyWithInterval = (
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

export const ordinalsList = (days: number[], style: OrdinalStyle): string =>
  joinList(days.map((d) => ord(d, style)));

export const durationToTextFromParts = (parts: DurationParts): string => {
  const order: (keyof DurationParts)[] = [
    'years',
    'months',
    'weeks',
    'days',
    'hours',
    'minutes',
    'seconds',
  ];
  const labels: Record<string, string> = {
    years: 'year',
    months: 'month',
    weeks: 'week',
    days: 'day',
    hours: 'hour',
    minutes: 'minute',
    seconds: 'second',
  };
  const chunks: string[] = [];
  for (const k of order) {
    const v = parts[k];
    if (typeof v === 'number' && v > 0)
      chunks.push(`${v} ${labels[k]}${v === 1 ? '' : 's'}`);
  }
  return chunks.join(' ');
};
