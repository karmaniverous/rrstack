/**
 * Library entry point.
 * - Re-export RRStack and public types.
 * - Type-only exports to keep runtime lean.
 */

export { RRStack } from './rrstack';
export type {
  Frequency,
  instantStatus,
  rangeStatus,
  RRStackJson,
  RRStackOptions,
  RRStackOptionsNormalized,
  RRuleOptions,
  RuleJson,
  RuleOptionsJson,
  TimeZoneId,
  UnixTimeUnit,
  DurationParts,
} from './rrstack/types';
