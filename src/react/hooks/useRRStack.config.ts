import type { RRStack } from '../../rrstack/RRStack';
import type { LogEventType } from './useRRStack.logger';

// Debounce defaults (ms)
export const CHANGE_DEBOUNCE_MS = 600;
export const MUTATE_DEBOUNCE_MS = 150;
export const RENDER_DEBOUNCE_MS = 50;

// Debounce option shape:
// - true: use default delay
// - number: explicit delay
// - object: { delay?: number; leading?: boolean }
export type DebounceSpec =
  | true
  | number
  | {
      delay?: number;
      leading?: boolean;
    };

export interface DebounceCfgNormalized {
  delay: number;
  leading: boolean;
}

export const normalizeDebounce = (
  spec: DebounceSpec | undefined,
  defaultDelay: number,
): DebounceCfgNormalized | undefined => {
  if (spec === undefined) return undefined;
  if (spec === true) return { delay: defaultDelay, leading: false };
  if (typeof spec === 'number') return { delay: spec, leading: false };
  const { delay, leading = false } = spec;
  return { delay: typeof delay === 'number' ? delay : defaultDelay, leading };
};

/**
 * Shared base options for RRStack React hooks.
 */
export interface UseRRStackBaseProps {
  renderDebounce?: DebounceSpec;
  logger?: boolean | ((e: { type: LogEventType; rrstack: RRStack }) => void);
  resetKey?: string | number;
}

/**
 * Shared base output for RRStack React hooks.
 */
export interface UseRRStackBaseOutput {
  version: number;
  flushRender: () => void;
}
