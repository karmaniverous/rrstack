/**
 * Library entry point.
 * - Re-export RRStack and public types.
 * - Type-only exports to keep runtime lean.
 */

export { RRStack } from './rrstack';
export { describeRule } from './rrstack/describe';
export { fromIsoDuration, toIsoDuration } from './rrstack/duration';
// JSON input type matching the published JSON Schema
export type { RRStackJson } from './rrstack/RRStack.options';
// Time conversion helpers (public utilities)
export { dateOnlyToEpoch, epochToWallDate, wallTimeToEpoch } from './time';
// Description translators & lexicon
export type { DescribeConfig } from './rrstack/describe/config';
export type {
  RuleDescriptor,
  RuleDescriptorRecur,
  RuleDescriptorSpan,
  WeekdayPos,
} from './rrstack/describe/descriptor';
export type {
  FrequencyAdjectiveLabels,
  FrequencyLexicon,
  FrequencyNounLabels,
} from './rrstack/describe/lexicon';
export {
  FREQUENCY_ADJECTIVE_EN,
  FREQUENCY_LEXICON_EN,
  FREQUENCY_NOUN_EN,
  toFrequencyOptions,
} from './rrstack/describe/lexicon';
export type { DescribeTranslator } from './rrstack/describe/translate/strict';
export { RRSTACK_CONFIG_SCHEMA } from './rrstack/RRStack.schema';
export type {
  DefaultEffect,
  DurationParts,
  FrequencyStr,
  InstantStatus,
  // Update API
  Notice,
  RangeStatus,
  RRStackOptions,
  RRStackOptionsNormalized,
  RRuleOptions,
  RuleJson,
  RuleOptionsJson,
  TimeZoneId,
  UnixTimeUnit,
  UpdatePolicy,
} from './rrstack/types';
