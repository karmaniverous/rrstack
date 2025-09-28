/**
 * Library entry point.
 * - Re-export RRStack and public types.
 * - Type-only exports to keep runtime lean.
 */

export { RRStack } from './rrstack';
export type { DescribeOptions } from './rrstack/describe';
export { describeRule } from './rrstack/describe';
export { fromIsoDuration, toIsoDuration } from './rrstack/duration';
// Description translators & lexicon
export type {
  RuleDescriptor,
  RuleDescriptorRecur,
  RuleDescriptorSpan,
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
export type {
  DescribeTranslator,
  OrdinalStyle,
  TranslatorOptions,
} from './rrstack/describe/translate.strict.en';
export { RRSTACK_CONFIG_SCHEMA } from './rrstack/RRStack.schema';
export type {
  DurationParts,
  FrequencyStr,
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
