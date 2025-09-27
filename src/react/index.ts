/**
 * React adapter entry.
 * - Exposes hooks that integrate a live RRStack instance with React.
 */
export type {
  DebounceSpec,
  UseRRStackBaseOptions,
  UseRRStackBaseOutput,
} from './hooks/useRRStack.config';
export type { UseRRStackOptions, UseRRStackOutput } from './useRRStack';
export { useRRStack } from './useRRStack';
export type {
  UseRRStackSelectorOptions,
  UseRRStackSelectorOutput,
} from './useRRStackSelector';
export { useRRStackSelector } from './useRRStackSelector';
