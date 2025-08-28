/**
 * Public RRStack types, options, and JSON shapes.
 *
 * Design notes
 * - Unit-aware domain: no EPOCH_* constants exported; domain bounds are handled
 *   internally according to {@link UnixTimeUnit}.
 * - Keep module small and testable (SRP).
 */

import type { Options as RRuleOptions } from 'rrule';

/** Instant status classification for a timestamp. */
export type instantStatus = 'active' | 'blackout';
/** Range classification across `[from, to)`. */
export type rangeStatus = instantStatus | 'partial';

/** Time unit for inputs/outputs and internal computation. */
export type UnixTimeUnit = 'ms' | 's';

/**
 * Branded IANA timezone id after runtime validation. Use
 * {@link RRStack.asTimeZoneId | RRStack.asTimeZoneId} to construct one from a string.
 */
export type TimeZoneId = string & { __brand: 'TimeZoneId' };

/**
 * Human-readable RRULE frequency (lower-case).
 * Mapped internally to rrule's numeric Frequency enum during compilation.
 */
export type FrequencyStr =
  | 'yearly'
  | 'monthly'
  | 'weekly'
  | 'daily'
  | 'hourly'
  | 'minutely'
  | 'secondly';

/**
 * Structured duration parts for UI-friendly, lossless round-tripping.
 * - All fields are non-negative integers.
 * - At least one field must be \> 0 (duration must be strictly positive).
 * - Calendar vs exact:
 *   • \{ days: 1 \} → calendar day (can be 23/25 hours across DST),
 *   • \{ hours: 24 \} → exact 24 hours.
 */
export interface DurationParts {
  years?: number; // non-negative integer
  months?: number; // non-negative integer
  weeks?: number; // non-negative integer (treated as 7 days)
  days?: number; // non-negative integer
  hours?: number; // non-negative integer
  minutes?: number; // non-negative integer
  seconds?: number; // non-negative integer
}

/**
 * JSON shape for rule options:
 * - Derived from rrule Options with `dtstart`/`until`/`tzid` removed.
 * - All properties optional except `freq` (required).
 * - Adds `starts`/`ends` in the configured {@link UnixTimeUnit} for domain clamping.
 * - `freq` is a lower-case string (e.g., 'daily'); RRStack maps it to rrule's numeric enum internally.
 */
export type RuleOptionsJson = Partial<
  Omit<RRuleOptions, 'dtstart' | 'until' | 'tzid' | 'freq'>
> & {
  freq: FrequencyStr;
  // timestamps in the configured unit ('ms' or 's')
  starts?: number;
  ends?: number;
};

/** A single rule in the cascade. */
export interface RuleJson {
  /** `'active' | 'blackout'` — effect applied at covered instants. */
  effect: instantStatus;
  /** Structured duration (non-negative integer parts; at least one \> 0). */
  duration: DurationParts;
  /** Subset of rrule options (see {@link RuleOptionsJson}). */
  options: RuleOptionsJson;
  /** Optional label for diagnostics/UI. */
  label?: string;
}

/**
 * Constructor input and serialized output (round-trippable).
 * - `version` is optional on input and ignored by the constructor.
 * - {@link RRStack.toJson | toJson()} always writes the current package version.
 */
export interface RRStackOptions {
  /** Optional version string; ignored by the constructor. */
  version?: string;
  /** IANA timezone id (validated at runtime). */
  timezone: string;
  /** Time unit ('ms' | 's'). Defaults to 'ms'. */
  timeUnit?: UnixTimeUnit;
  /** Rule list. Defaults to empty. */
  rules?: RuleJson[];
}

/**
 * Normalized options stored on the instance (frozen).
 * - `timeUnit` is required.
 * - `rules` is a readonly array.
 * - `timezone` is a branded, validated string.
 */
export interface RRStackOptionsNormalized
  extends Omit<RRStackOptions, 'timeUnit' | 'rules' | 'timezone'> {
  timeUnit: UnixTimeUnit;
  rules: ReadonlyArray<RuleJson>;
  timezone: TimeZoneId;
}

// Re-export useful rrule types so consumers can import from package API.
export type { Options as RRuleOptions } from 'rrule';