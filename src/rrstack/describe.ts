/**
 * Requirements addressed:
 * - Provide a human-readable rule description leveraging rrule's toText().
 * - Include effect and duration; optionally include timezone and bounds.
 * - Allow custom formatting of the timezone label.
 */

import { DateTime } from 'luxon';

import type { CompiledRecurRule, CompiledRule } from './compile';
import { compileRule } from './compile';
import {
  buildRuleDescriptor,
  type RuleDescriptor,
} from './describe/descriptor';
import {
  type DescribeTranslator,
  strictEnTranslator,
  type TranslatorOptions,
} from './describe/translate.strict.en';
import { Weekday } from './rrule.runtime';
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
  /** Optional translator override ('strict-en' or custom) */
  translator?: 'strict-en' | DescribeTranslator;
  /** Options for the translator. */
  translatorOptions?: TranslatorOptions;
}

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
  const descriptor: RuleDescriptor = buildRuleDescriptor(recur);
  const tx: DescribeTranslator =
    typeof opts.translator === 'function'
      ? opts.translator
      : strictEnTranslator;
  const recurText = tx(descriptor, opts.translatorOptions);
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
