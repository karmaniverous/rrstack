import { DateTime } from 'luxon';

import type { CompiledRecurRule, CompiledRule } from '../compile';
import { Frequency, Weekday } from '../rrule.runtime';
import type { DurationParts, FrequencyStr, UnixTimeUnit } from '../types';

export interface RuleDescriptorBase {
  kind: 'span' | 'recur';
  effect: 'active' | 'blackout';
  tz: string;
  unit: UnixTimeUnit;
  clamps?: { starts?: number; ends?: number };
}

export interface WeekdayPos {
  /** 1..7 (Mon..Sun) */
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** ±1..±5; -1 === last */
  nth?: number;
}

export interface RuleDescriptorRecur extends RuleDescriptorBase {
  kind: 'recur';
  freq: FrequencyStr;
  interval: number;
  duration: DurationParts;
  by: {
    months?: number[];
    monthDays?: number[];
    yearDays?: number[];
    weekNos?: number[];
    weekdays?: WeekdayPos[];
    hours?: number[];
    minutes?: number[];
    seconds?: number[];
    setpos?: number[];
    wkst?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  };
  count?: number;
  until?: number;
}

export interface RuleDescriptorSpan extends RuleDescriptorBase {
  kind: 'span';
}

export type RuleDescriptor = RuleDescriptorRecur | RuleDescriptorSpan;

const toUnitEpoch = (d: Date, tz: string, unit: UnixTimeUnit): number =>
  unit === 'ms'
    ? DateTime.fromJSDate(d, { zone: tz }).toMillis()
    : Math.trunc(DateTime.fromJSDate(d, { zone: tz }).toSeconds());

const asArray = <T>(v: T | T[] | null | undefined): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

const FREQ_NUM_TO_STR: Record<number, FrequencyStr> = {
  [Frequency.YEARLY]: 'yearly',
  [Frequency.MONTHLY]: 'monthly',
  [Frequency.WEEKLY]: 'weekly',
  [Frequency.DAILY]: 'daily',
  [Frequency.HOURLY]: 'hourly',
  [Frequency.MINUTELY]: 'minutely',
  [Frequency.SECONDLY]: 'secondly',
};

const freqToStr = (n: number): FrequencyStr => FREQ_NUM_TO_STR[n] ?? 'daily';

const asDurationParts = (r: CompiledRecurRule): DurationParts => {
  const o = r.duration.toObject();
  const i = (x?: number) =>
    typeof x === 'number' && Number.isFinite(x) ? Math.round(x) : undefined;
  return {
    years: i(o.years),
    months: i(o.months),
    weeks: i(o.weeks),
    days: i(o.days),
    hours: i(o.hours),
    minutes: i(o.minutes),
    seconds: i(o.seconds),
  };
};

export const buildRuleDescriptor = (c: CompiledRule): RuleDescriptor => {
  if (c.kind === 'span') {
    return {
      kind: 'span',
      effect: c.effect,
      tz: c.tz,
      unit: c.unit,
      clamps: {
        starts: typeof c.start === 'number' ? c.start : undefined,
        ends: typeof c.end === 'number' ? c.end : undefined,
      },
    };
  }
  const r = c;
  // Convert rrule weekday (0..6 MO..SU) to 1..7 Mon..Sun
  const toWkst = (w: unknown): 1 | 2 | 3 | 4 | 5 | 6 | 7 | undefined => {
    if (typeof w === 'number') {
      const idx = (w + 1) % 7 || 7;
      return idx as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    }
    if (w instanceof Weekday) {
      const idx = (w.weekday + 1) % 7 || 7;
      return idx as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    }
    return undefined;
  };
  const weekdays: WeekdayPos[] = [];
  for (const w of asArray<unknown>(
    (r.options as { byweekday?: unknown }).byweekday,
  )) {
    if (w instanceof Weekday) {
      const idx = toWkst(w)!;
      const nth = typeof w.n === 'number' && w.n !== 0 ? w.n : undefined;
      weekdays.push({ weekday: idx, nth });
    } else if (typeof w === 'number') {
      const idx = toWkst(w);
      if (idx) weekdays.push({ weekday: idx });
    }
  }
  const untilDate = (r.options as { until?: Date | null }).until ?? undefined;
  const dtstart = (r.options as { dtstart?: Date | null }).dtstart ?? undefined;
  const clamps =
    dtstart || untilDate
      ? {
          starts: dtstart ? toUnitEpoch(dtstart, r.tz, r.unit) : undefined,
          ends: untilDate ? toUnitEpoch(untilDate, r.tz, r.unit) : undefined,
        }
      : undefined;
  const wkst = (r.options as { wkst?: unknown }).wkst;
  const desc: RuleDescriptorRecur = {
    kind: 'recur',
    effect: r.effect,
    tz: r.tz,
    unit: r.unit,
    clamps,
    freq: freqToStr(r.options.freq as number),
    interval:
      typeof r.options.interval === 'number' && r.options.interval > 0
        ? r.options.interval
        : 1,
    duration: asDurationParts(r),
    by: {
      months: asArray<number>(
        (r.options as { bymonth?: number[] | number | null }).bymonth,
      ),
      monthDays: asArray<number>(
        (r.options as { bymonthday?: number[] | number | null }).bymonthday,
      ),
      yearDays: asArray<number>(
        (r.options as { byyearday?: number[] | number | null }).byyearday,
      ),
      weekNos: asArray<number>(
        (r.options as { byweekno?: number[] | number | null }).byweekno,
      ),
      weekdays,
      hours: asArray<number>(
        (r.options as { byhour?: number[] | number | null }).byhour,
      ),
      minutes: asArray<number>(
        (r.options as { byminute?: number[] | number | null }).byminute,
      ),
      seconds: asArray<number>(
        (r.options as { bysecond?: number[] | number | null }).bysecond,
      ),
      setpos: asArray<number>(
        (r.options as { bysetpos?: number[] | number | null }).bysetpos,
      ),
      wkst: toWkst(wkst),
    },
    count: (r.options as { count?: number | null }).count ?? undefined,
    until: untilDate ? toUnitEpoch(untilDate, r.tz, r.unit) : undefined,
  };
  return desc;
};
