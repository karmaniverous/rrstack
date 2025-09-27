import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import type { RRStack } from '../rrstack/RRStack';
import {
  normalizeDebounce,
  RENDER_DEBOUNCE_MS,
  type UseRRStackBaseOutput,
  type UseRRStackBaseProps,
} from './hooks/useRRStack.config';
import { createLogger } from './hooks/useRRStack.logger';
import {
  createRenderBumper,
  type RenderBumper,
} from './hooks/useRRStack.render';

export interface UseRRStackSelectorProps<T> extends UseRRStackBaseProps {
  rrstack: RRStack;
  selector: (s: RRStack) => T;
  isEqual?: (a: T, b: T) => boolean;
}

export interface UseRRStackSelectorOutput<T> extends UseRRStackBaseOutput {
  selection: T;
}

/**
 * Subscribe to an RRStack-derived value with optional debounced renders.
 * Re-evaluates `selector` on stack mutations; only schedules a paint when
 * `isEqual` deems the selection to have changed. Renders can be coalesced
 * via `renderDebounce` (trailing is always true; optional leading).
 */
export function useRRStackSelector<T>({
  rrstack,
  selector,
  isEqual = Object.is,
  renderDebounce,
  logger,
  resetKey,
}: UseRRStackSelectorProps<T>): UseRRStackSelectorOutput<T> {
  const rrstackRef = useRef(rrstack);
  rrstackRef.current = rrstack;

  const log = useMemo(() => createLogger(logger, rrstackRef), [logger]);
  useEffect(() => {
    log('init');
  }, [log]);
  useEffect(() => {
    if (resetKey !== undefined) log('reset');
  }, [resetKey, log]);

  // Debounce config and render bumper
  const renderCfgRef = useRef(
    normalizeDebounce(renderDebounce, RENDER_DEBOUNCE_MS),
  );
  renderCfgRef.current = normalizeDebounce(renderDebounce, RENDER_DEBOUNCE_MS);
  const renderRef = useRef<RenderBumper | null>(null);
  renderRef.current ??= createRenderBumper(renderCfgRef);

  // Initial selection per rrstack/resetKey/selector
  const initial = useMemo(
    () => selector(rrstack),
    [rrstack, selector, resetKey],
  );
  const cacheRef = useRef<T>(initial);
  cacheRef.current = initial;

  // Version counter for useSyncExternalStore
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (reactCb: () => void) => {
      const unsub = rrstack.subscribe(() => {
        const next = selector(rrstack);
        if (!isEqual(cacheRef.current, next)) {
          log('mutate');
          const bumpOnce = () => {
            cacheRef.current = next;
            versionRef.current++;
            try {
              reactCb();
            } catch {
              /* noop */
            }
          };
          try {
            renderRef.current!.bump(bumpOnce);
          } catch {
            bumpOnce();
          }
        }
      });
      return () => {
        unsub();
      };
    },
    [rrstack, selector, isEqual, log],
  );

  const version = useSyncExternalStore(
    subscribe,
    () => versionRef.current,
    () => 0,
  );

  const flushRender = useCallback(() => {
    try {
      renderRef.current!.flush();
    } finally {
      log('flushRender');
    }
  }, [log]);

  return { selection: cacheRef.current, version, flushRender };
}
