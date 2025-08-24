/**
 * Requirements addressed:
 * - Provide public RRStack types, options, and JSON shapes.
 * - Eliminate EPOCH_* constants; unit/domain handled internally.
 * - Keep module small and testable (SRP).
 */

import type { Options as RRuleOptions } from 'rrule';

export type instantStatus = 'active' | 'blackout';
export type rangeStatus = instantStatus | 'partial';

export type UnixTimeUnit = 'ms' | 's';

// Branded IANA timezone id after runtime validation.
export type TimeZoneId = string & { __brand: 'TimeZoneId' };

/**
 * JSON shape for rule options:
 * - Derived from RRuleOptions with dtstart/until/tzid removed.
 * - All properties optional except freq (required).
 * - Adds starts/ends (in configured unit) for domain clamping.
 */
export type RuleOptionsJson =
  & Partial<Omit<RRuleOptions, 'dtstart' | 'until' | 'tzid' | 'freq'>>
  & Pick<RRuleOptions, 'freq'>
  & {
    // timestamps in the configured unit ('ms' or 's')
    starts?: number;
    ends?: number;
  };

export interface RuleJson {
  effect: instantStatus; // 'active' | 'blackout'
  duration: string; // ISO-8601 (e.g., 'PT1H', 'P1M')
  options: RuleOptionsJson;
  label?: string;
}

// Constructor input (user-provided).
export interface RRStackOptions {
  timezone: string;
  timeUnit?: UnixTimeUnit; // default 'ms'
  rules?: RuleJson[]; // default []
}

// Normalized options stored on the instance (frozen).
export interface RRStackOptionsNormalized extends Omit<RRStackOptions, 'timeUnit' | 'rules' | 'timezone'> {
  timeUnit: UnixTimeUnit;
  rules: ReadonlyArray<RuleJson>;
  timezone: TimeZoneId;
}

// Flattened JSON shape (no nested options) with version.
export interface RRStackJson extends RRStackOptionsNormalized {
  version: string;
}

// Re-export useful rrule types so consumers can import from package API.
export type { Frequency, Options as RRuleOptions } from 'rrule';
