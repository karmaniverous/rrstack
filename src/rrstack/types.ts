/**
 * Requirements addressed:
 * - Provide public RRStack types derived from rrule types (no redeclared token unions).
 * - Expose domain constants and JSON shapes for persistence.
 * - Keep module small and testable (SRP).
 */

import type { Options as RRuleOptions, Frequency } from 'rrule';

export const EPOCH_MIN_MS = 0;
export const EPOCH_MAX_MS = 2_147_483_647_000; // 2038-01-19T03:14:07Z

export type instantStatus = 'active' | 'blackout';
export type rangeStatus = instantStatus | 'partial';

export interface RuleOptionsJson {
  // rrule-native option types; tokens from rrule (no redefinitions)
  freq: Frequency;
  interval?: RRuleOptions['interval'];
  wkst?: RRuleOptions['wkst'];
  count?: RRuleOptions['count'];

  bysetpos?: RRuleOptions['bysetpos'];
  bymonth?: RRuleOptions['bymonth'];
  bymonthday?: RRuleOptions['bymonthday'];
  byyearday?: RRuleOptions['byyearday'];
  byweekno?: RRuleOptions['byweekno'];
  byweekday?: RRuleOptions['byweekday'];
  byhour?: RRuleOptions['byhour'];
  byminute?: RRuleOptions['byminute'];
  bysecond?: RRuleOptions['bysecond'];

  // ms timestamps; undefined => unbounded side (clamped to domain)
  starts?: number;
  ends?: number;
}

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
export type { Options as RRuleOptions, Frequency } from 'rrule';
