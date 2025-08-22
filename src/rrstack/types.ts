/**
 * Requirements addressed:
 * - Provide public RRStack types derived from rrule types without redeclaring token unions.
 * - Expose domain constants and JSON shapes for persistence.
 * - Keep module small and testable (SRP).
 */

import type { Frequency, Options as RRuleOptions } from 'rrule';

export const EPOCH_MIN_MS = 0;
export const EPOCH_MAX_MS = 2_147_483_647_000; // 2038-01-19T03:14:07Z

export type instantStatus = 'active' | 'blackout';
export type rangeStatus = instantStatus | 'partial';

// Utility: make all properties optional except a required key set K.
type OptionalizeExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/**
 * JSON shape for rule options:
 * - Derived from RRuleOptions with dtstart/until/tzid removed.
 * - All properties optional except freq (required).
 * - Adds starts/ends (ms) for domain clamping.
 */
export type RuleOptionsJson = OptionalizeExcept<
  Omit<RRuleOptions, 'dtstart' | 'until' | 'tzid'>,
  'freq'
> & {
  // ms timestamps; undefined => unbounded side (clamped internally)
  starts?: number;
  ends?: number;
};

export interface RuleJson {
  effect: instantStatus; // 'active' | 'blackout'
  duration: string; // ISO-8601 (e.g., 'PT1H', 'P1M')
  options: RuleOptionsJson;
  label?: string;
}

export interface RRStackJsonV1 {
  version: 1;
  timezone: string; // IANA time zone
  rules: RuleJson[];
}

// Re-export useful rrule types so consumers can import from package API.
export type { Frequency, Options as RRuleOptions } from 'rrule';
