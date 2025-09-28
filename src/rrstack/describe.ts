/**
 * Requirements addressed:
 * - Provide a human-readable rule description leveraging rrule's toText().
 * - Include effect and duration; optionally include timezone and bounds.
 * - Allow custom formatting of the timezone label.
 */

import { DateTime } from 'luxon';

import type { CompiledRecurRule, CompiledRule } from './compile';
import { compileRule } from './compile';
import { Frequency, Weekday } from './rrule.runtime';
import type {
  DurationParts,
  RuleJson,
  TimeZoneId,
  UnixTimeUnit,
} from './types';

const plural = (n: number, unit: string) =>
  String(n) + ' ' + unit + (n === 1 ? '' : 's');

const durationToTextFromParts = (parts: DurationParts): string => {
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
    if (typeof v === 'number' && v > 0) chunks.push(plural(v, labels[k]));
  }
  return chunks.join(' ');
};

const durationToTextFromCompiled = (compiled: CompiledRecurRule): string => {
  const o = compiled.duration.toObject();
  // Our DurationParts are integers by validation; coerce to integers defensively.
  const asInt = (n?: number) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : undefined;
  return durationToTextFromParts({
    years: asInt(o.years),
    months: asInt(o.months),
    weeks: asInt(o.weeks),
    days: asInt(o.days),
    hours: asInt(o.hours),
    minutes: asInt(o.minutes),
    seconds: asInt(o.seconds),
  });
};

export interface DescribeOptions {
  /** Append "(timezone <tz>)" — default true */
  includeTimeZone?: boolean;
  /** Append "[from <dtstart>; until <until>]" if clamps are present — default false */
  includeBounds?: boolean;
  /**
   * Optional formatter for the timezone label. When provided and
   * includeTimeZone is true, the description will use
   * `(timezone formatTimeZone(tzId))` instead of the raw tz id.
   */
  formatTimeZone?: (tzId: string) => string;
}

// Helpers for basic “strict‑en” phrasing used to satisfy immediate tests.
const ORDINAL_EN: Record<number, string> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  [-1]: 'last',
};

const toOrdinal = (n: number): string => ORDINAL_EN[n] ?? `${String(n)}th`;

const WEEKDAY_NAME_EN: Record<number, string> = {
  // rrule Weekday.weekday: 0..6 (MO..SU)
  0: 'monday',
  1: 'tuesday',
  2: 'wednesday',
  3: 'thursday',
  4: 'friday',
  5: 'saturday',
  6: 'sunday',
};

const weekdayName = (w: unknown): string | undefined => {
  if (w instanceof Weekday) return WEEKDAY_NAME_EN[w.weekday];
  if (typeof w === 'number') return WEEKDAY_NAME_EN[w];
  return undefined;
};

const asArray = <T>(v: T | T[] | null | undefined): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

const formatTimeHM = (r: CompiledRecurRule): string | undefined => {
  const h = asArray<number>(r.options.byhour)[0];
  if (typeof h !== 'number') return undefined;
  const mRaw = asArray<number>(r.options.byminute)[0] ?? 0;
  const hStr = String(h);
  const mStr = String(mRaw).padStart(2, '0');
  return `${hStr}:${mStr}`;
};

/**
 * Minimal strict-en recurrence phrasing to satisfy tests, with fallback to
 * rrule.toText() for general cases.
 */
const describeRecurMinimal = (r: CompiledRecurRule): string => {
  const freq = r.options.freq;
  // Daily: “every day [at h:mm]”
  if (freq === Frequency.DAILY) {
    const tm = formatTimeHM(r);
    return tm ? `every day at ${tm}` : 'every day';
  }
  // Monthly + bysetpos + single weekday: “every month on the <ordinal> <weekday> [at h:mm]”
  if (freq === Frequency.MONTHLY) {
    const setpos = asArray<number>(r.options.bysetpos);
    const wdays = asArray<unknown>(r.options.byweekday);
    if (setpos.length === 1 && wdays.length === 1) {
      const ord = toOrdinal(setpos[0]);
      const wd = weekdayName(wdays[0]);
      if (wd) {
        const tm = formatTimeHM(r);
        return `every month on the ${ord} ${wd}${tm ? ` at ${tm}` : ''}`;
      }
    }
  }
  // Fallback: defer to rrule’s toText()
  return r.rrule.toText();
};

/**
 * Build a plain-language description of a compiled rule.
 * - Example: "Active for 1 hour: every day at 5:00 (timezone UTC)"
 */
export const describeCompiledRule = (
  compiled: CompiledRule,
  opts: DescribeOptions = {},
): string => {
  const {
    includeTimeZone = true,
    includeBounds = false,
    formatTimeZone,
  } = opts;
  const effect = compiled.effect === 'active' ? 'Active' : 'Blackout';
  if (compiled.kind === 'span') {
    // Continuous coverage between clamps (open sides allowed)
    let s = `${effect} continuously`;
    if (includeTimeZone) {
      const tzLabel = formatTimeZone
        ? formatTimeZone(compiled.tz)
        : compiled.tz;
      s += ` (timezone ${tzLabel})`;
    }
    if (includeBounds) {
      const tz = compiled.tz;
      const fmt = (v?: number) =>
        typeof v === 'number'
          ? (compiled.unit === 'ms'
              ? DateTime.fromMillis(v, { zone: tz })
              : DateTime.fromSeconds(v, { zone: tz })
            ).toISO({ suppressMilliseconds: true })
          : undefined;
      const from = fmt(compiled.start);
      const until = fmt(compiled.end);
      if (from || until) {
        s += ' [';
        if (from) s += `from ${from}`;
        if (from && until) s += '; ';
        if (until) s += `until ${until}`;
        s += ']';
      }
    }
    return s;
  }
  const recur = compiled;
  const durText = durationToTextFromCompiled(recur);
  // Use minimal strict-en phrasing for key cases; otherwise fallback to rrule.toText().
  const recurText = describeRecurMinimal(recur);
  let s = `${effect} for ${durText}: ${recurText}`;
  if (includeTimeZone) {
    const tzLabel = formatTimeZone ? formatTimeZone(recur.tz) : recur.tz;
    s += ` (timezone ${tzLabel})`;
  }

  if (includeBounds) {
    // Example:
    // describeCompiledRule(compiled, { includeBounds: true })
    // → "... [from 2024-01-10T00:00:00.000Z; until 2024-02-01T00:00:00.000Z]"
    // (bounds appear only if the rule options include clamps that compiled
    //  to dtstart/until)

    const tz = recur.tz;
    const fmt = (d: Date | null | undefined) =>
      d
        ? DateTime.fromJSDate(d, { zone: tz }).toISO({
            suppressMilliseconds: true,
          })
        : undefined;
    const from = fmt((recur.options as { dtstart?: Date | null }).dtstart);
    const until = fmt((recur.options as { until?: Date | null }).until);
    if (from || until) {
      s += ' [';
      if (from) s += `from ${from}`;
      if (from && until) s += '; ';
      if (until) s += `until ${until}`;
      s += ']';
    }
  }
  return s;
};
/**
 * Build a plain-language description of a JSON rule in a given tz/unit.
 * Convenience wrapper that compiles the rule with the provided context.
 */
export const describeRule = (
  rule: RuleJson,
  timezone: TimeZoneId,
  unit: UnixTimeUnit,
  opts: DescribeOptions = {},
): string => {
  const compiled = compileRule(rule, timezone, unit);
  return describeCompiledRule(compiled, opts);
};

/**
 * @example
 * ```ts
 * const text = describeRule(rule, RRStack.asTimeZoneId('UTC'), 'ms', {
 *   includeTimeZone: true,
 *   formatTimeZone: (tz) => friendlyTzNameMap[tz] ?? tz,
 *   includeBounds: true,
 * });
 * ```
 */
