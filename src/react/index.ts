/**
 * React adapter entry.
 * - Exposes hooks that integrate a live RRStack instance with React.
 */
export type {
  DebounceSpec,
  UseRRStackBaseOutput,
  UseRRStackBaseProps,
} from './hooks/useRRStack.config';
export type { UseRRStackOutput, UseRRStackProps } from './useRRStack';
export { useRRStack } from './useRRStack';
export type {
  UseRRStackSelectorOutput,
  UseRRStackSelectorProps,
} from './useRRStackSelector';
export { useRRStackSelector } from './useRRStackSelector';
