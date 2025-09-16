/**
 * Library entry point.
 * - Re-export RRStack and public types.
 * - Type-only exports to keep runtime lean.
 */

export { RRStack } from './rrstack';
export type { DescribeOptions } from './rrstack/describe';
export { describeRule } from './rrstack/describe';
export { fromIsoDuration, toIsoDuration } from './rrstack/duration';
export { RRSTACK_CONFIG_SCHEMA } from './rrstack/RRStack.schema';
export type {  DurationParts,  FrequencyStr,
  instantStatus,
  rangeStatus,
  RRStackOptions,
  RRStackOptionsNormalized,
  RRuleOptions,
  RuleJson,
  RuleOptionsJson,
  TimeZoneId,
  UnixTimeUnit,
} from './rrstack/types';