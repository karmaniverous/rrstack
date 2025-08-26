/**
 * Library entry point.
 * - Re-export RRStack and public types.
 * - Type-only exports to keep runtime lean.
 */

export { RRStack } from './rrstack';
export { fromIsoDuration,toIsoDuration } from './rrstack/duration';
export { RRSTACK_JSON_SCHEMA } from './rrstack/RRStack.schema';
export type {
  DurationParts,
  Frequency,
  instantStatus,
  rangeStatus,  RRStackJson,
  RRStackOptions,
  RRStackOptionsNormalized,
  RRuleOptions,
  RuleJson,
  RuleOptionsJson,
  TimeZoneId,
  UnixTimeUnit,
} from './rrstack/types';
