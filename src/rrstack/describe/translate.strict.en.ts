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
  // Normalize pluralizer locally to avoid no-unnecessary-condition on ??
  let pl = lex.pluralize as ((noun: string, n: number) => string) | undefined;
  if (!pl) pl = (n, k) => (k === 1 ? n : `${n}s`);
  const plural = pl(lex.noun[freq], interval);
  return `every ${String(interval)} ${plural}`;
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
    return tm ? `${base} at ${tm}` : base;
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
        return `${base} on the ${o} ${name}${tm ? ` at ${tm}` : ''}`;
      }
    }
  }
  // Fallback: base only (further constraints can be added incrementally)
  return base;
};

export const strictEnTranslator: DescribeTranslator = (
  desc: RuleDescriptor,
  opts?: TranslatorOptions,
): string => {
  if (desc.kind === 'span') return 'continuously';
  return phraseRecur(desc, opts);
};
