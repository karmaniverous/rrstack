import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import { RRStack } from '../rrstack/RRStack';
import type { RRStackOptions } from '../rrstack/types';
import {
  CHANGE_DEBOUNCE_MS,
  type DebounceSpec,
  MUTATE_DEBOUNCE_MS,
  normalizeDebounce,
  RENDER_DEBOUNCE_MS,
} from './hooks/useRRStack.config';
import { createRRStackFacade } from './hooks/useRRStack.facade';
import { createLogger, type LogEventType } from './hooks/useRRStack.logger';
import {
  createMutateManager,
  type MutateManager,
} from './hooks/useRRStack.mutate';
import {
  type ChangeEmitter,
  createChangeEmitter,
} from './hooks/useRRStack.onChange';
import {
  createRenderBumper,
  type RenderBumper,
} from './hooks/useRRStack.render';

// Hook options. Trailing is always true for all debouncers by design.
interface Options {
  resetKey?: string | number;
  changeDebounce?: DebounceSpec;
  mutateDebounce?: DebounceSpec;
  renderDebounce?: DebounceSpec;
  logger?: boolean | ((e: { type: LogEventType; rrstack: RRStack }) => void);
}

export function useRRStack(
  json: RRStackOptions,
  onChange?: (stack: RRStack) => void,
  opts?: Options,
): {
  rrstack: RRStack; // façade (proxy)
  version: number;
  flushChanges: () => void;
  flushMutations: () => void;
  cancelMutations: () => void;
  flushRender: () => void;
} {
  const { resetKey, changeDebounce, mutateDebounce, renderDebounce, logger } =
    opts ?? {};

  // Recreate the instance intentionally when resetKey changes.
  const rrstack = useMemo(() => new RRStack(json), [resetKey]);
  // Refs for current instance and façade
  const rrstackRef = useRef(rrstack);
  rrstackRef.current = rrstack;
  const facadeRef = useRef<RRStack>(rrstack);

  // Logger bound to current rrstack
  const log = useMemo(() => createLogger(logger, rrstackRef), [logger]);

  // Change (autosave) debouncer
  const onChangeRef = useRef<typeof onChange>(onChange);
  onChangeRef.current = onChange;
  const changeCfgRef = useRef(
    normalizeDebounce(changeDebounce, CHANGE_DEBOUNCE_MS),
  );
  changeCfgRef.current = normalizeDebounce(changeDebounce, CHANGE_DEBOUNCE_MS);
  const changeRef = useRef<ChangeEmitter | null>(null);
  changeRef.current ??= createChangeEmitter(onChangeRef, changeCfgRef);

  // Mutate debouncer with staging manager
  const mutateCfgRef = useRef(
    normalizeDebounce(mutateDebounce, MUTATE_DEBOUNCE_MS),
  );
  mutateCfgRef.current = normalizeDebounce(mutateDebounce, MUTATE_DEBOUNCE_MS);
  const mutateRef = useRef<MutateManager | null>(null);
  mutateRef.current ??= createMutateManager(rrstackRef, mutateCfgRef, (t) => {
    log(t);
  });

  // Render bumper (coalesce paints)
  const renderCfgRef = useRef(
    normalizeDebounce(renderDebounce, RENDER_DEBOUNCE_MS),
  );
  renderCfgRef.current = normalizeDebounce(renderDebounce, RENDER_DEBOUNCE_MS);
  const renderRef = useRef<RenderBumper | null>(null);
  renderRef.current ??= createRenderBumper(renderCfgRef);

  // React external-store binding: one React-level subscriber per hook instance.
  // Use a monotonic counter for the snapshot; Date.now() can be frozen by fake timers.
  const versionRef = useRef(0);
  const version = useSyncExternalStore(
    useCallback(
      (reactCb) => {
        log('init');
        const unsub = rrstack.subscribe(() => {
          // call debounced onChange & log
          try {
            changeRef.current!.call(rrstackRef.current);
          } catch {
            /* noop */
          }
          // bump snapshot and then notify React
          const bumpOnce = () => {
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
            // if renderDebounce not initialized, fallback immediate
            bumpOnce();
          }
          log('mutate');
        });
        return () => {
          unsub();
        };
      },
      [log, rrstack],
    ),
    () => versionRef.current,
    () => 0,
  );

  useEffect(() => {
    if (resetKey !== undefined) log('reset');
  }, [resetKey, log]);

  // Build façade proxy once per rrstack instance (resetKey change)
  useEffect(() => {
    facadeRef.current = createRRStackFacade(rrstackRef, mutateRef.current!);
  }, [rrstack]);

  const flushChanges = useCallback(() => {
    changeRef.current!.flush();
    log('flushChanges');
  }, [log]);
  const flushMutations = useCallback(() => {
    mutateRef.current!.flush();
    log('flushMutations');
  }, [log]);
  const cancelMutations = useCallback(() => {
    mutateRef.current!.cancel();
    log('cancel');
  }, [log]);
  const flushRender = useCallback(() => {
    renderRef.current!.flush();
    log('flushRender');
  }, [log]);
  return {
    rrstack: facadeRef.current,
    version,
    flushChanges,
    flushMutations,
    cancelMutations,
    flushRender,
  };
}
