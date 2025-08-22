/**
 * This is the main entry point for the library.
 *
 * @packageDocumentation
 */

export { foo, type FooTarget } from './foo';

// RRStack public API
export { RRStack } from './rrstack';
export {
  EPOCH_MIN_MS,
  EPOCH_MAX_MS,
  type instantStatus,
  type rangeStatus,
  type RuleOptionsJson,
  type RuleJson,
  type RRStackJsonV1,
  type RRuleOptions,
  type Frequency,
} from './rrstack/types';
