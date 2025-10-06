/**
 * Requirements addressed:
 * - Provide a human-readable rule description leveraging rrule's toText().
 * - Bounds formatting must respect RRULE floating dates (UTC fields = local wall time).
 * - Include effect and duration; optionally include timezone and bounds.
 * - Include effect and duration; optionally include timezone and bounds.
 * - Allow custom formatting of the timezone label.
 */

import { DateTime } from 'luxon';

import type { CompiledRecurRule, CompiledRule } from '../compile';
import { compileRule } from '../compile';
import { DEFAULT_TIME_UNIT } from '../defaults';
import type {
  DurationParts,
  RuleJson,
  TimeZoneId,
  UnixTimeUnit,
} from '../types';
import { buildRuleDescriptor, type RuleDescriptor } from './descriptor';
import {
  type DescribeTranslator,
  strictEnTranslator,
  type TranslatorOptions,
} from './translate.strict.en';

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
  /** Append "(timezone <tz>)" — default false */
  includeTimeZone?: boolean;
  /** Append "[from <dtstart>; until <until>]" if clamps are present — default false */
  includeBounds?: boolean;
  /**
   * Optional formatter for the timezone label. When provided and
   * includeTimeZone is true, the description will use
   * `(timezone formatTimeZone(tzId))` instead of the raw tz id.
   */
  formatTimeZone?: (tzId: string) => string;
  /**
   * Optional format string for bounds when `includeBounds` is true.
   * When provided, bound instants are rendered via Luxon's `toFormat(boundsFormat)`
   * in the rule's timezone. When omitted, bounds use ISO with milliseconds
   * suppressed (default behavior).
   *
   * Examples:
   * - 'yyyy-LL-dd' → "2025-04-01"
   * - "dd LLL yyyy 'at' HH:mm" → "01 Apr 2025 at 07:30"
   *
   * Backward compatible: if undefined, behavior is unchanged.
   */
  boundsFormat?: string;
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
    includeTimeZone = false,
    includeBounds = false,
    boundsFormat,
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
      const fmt = (v?: number) => {
        if (typeof v !== 'number') return undefined;
        const dt =
          compiled.unit === 'ms'
            ? DateTime.fromMillis(v, { zone: tz })
            : DateTime.fromSeconds(v, { zone: tz });
        return boundsFormat
          ? dt.toFormat(boundsFormat)
          : dt.toISO({ suppressMilliseconds: true });
      };
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
    // dtstart/until are RRULE "floating" Dates — their UTC fields represent the
    // local wall time (year/month/day/hour/min/sec) in the rule’s timezone.
    // For human-friendly bounds we must rebuild a Luxon DateTime using those
    // UTC fields in the rule’s timezone instead of interpreting the JS Date as
    // an absolute instant.
    const fmt = (d: Date | null | undefined) => {
      if (!d) return undefined;
      const dt = DateTime.fromObject(
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
      );
      return boundsFormat
        ? dt.toFormat(boundsFormat)
        : dt.toISO({ suppressMilliseconds: true });
    };
    // Show "from" only when the rule had an explicit starts clamp.
    const from = !recur.isOpenStart
      ? fmt((recur.options as { dtstart?: Date | null }).dtstart)
      : undefined;
    // Show "until" only when the rule had an explicit ends clamp.
    const until = !recur.isOpenEnd
      ? fmt((recur.options as { until?: Date | null }).until)
      : undefined;
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
  timeUnit?: UnixTimeUnit,
  opts: DescribeOptions = {},
): string => {
  // Downstream callers may reasonably pass undefined to use the library default.
  const effectiveUnit = timeUnit ?? DEFAULT_TIME_UNIT;
  const compiled = compileRule(rule, timezone, effectiveUnit);
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
