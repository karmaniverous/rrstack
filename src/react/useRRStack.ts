import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import { RRStack } from '../rrstack/RRStack';
import type { RRStackOptions, RuleJson } from '../rrstack/types';

// Default delays (ms)
const CHANGE_DEBOUNCE_MS = 600;
const MUTATE_DEBOUNCE_MS = 150;
const RENDER_DEBOUNCE_MS = 50;

// Debounce option shape:
// - true: use default delay
// - number: explicit delay
// - object: { delay?: number; leading?: boolean }
type DebounceSpec = true | number | { delay?: number; leading?: boolean };

// Hook options. Trailing is always true for all debouncers by design.
interface Options {
  resetKey?: string | number;
  // Debounce autosave (onChange) calls
  changeDebounce?: DebounceSpec;
  // Debounce rrstack mutations (UI -> rrstack)
  mutateDebounce?: DebounceSpec;
  // Debounce renders (rrstack -> UI)
  renderDebounce?: DebounceSpec;
  logger?:
    | boolean
    | ((e: {
        type:
          | 'init'
          | 'reset'
          | 'mutate'
          | 'commit'
          | 'flushChanges'
          | 'flushMutations'
          | 'flushRender'
          | 'cancel';
        rrstack: RRStack;
      }) => void);
}
const toDebounceCfg = (
  v: DebounceSpec | undefined,
  defaultDelay: number,
): { delay: number; leading: boolean } | undefined => {
  if (v === undefined) return undefined;
  if (v === true) return { delay: defaultDelay, leading: false };
  if (typeof v === 'number') return { delay: v, leading: false };
  const { delay, leading = false } = v;
  return { delay: typeof delay === 'number' ? delay : defaultDelay, leading };
};

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
  const {
    resetKey,
    changeDebounce: changeDebounceOpt,
    mutateDebounce: mutateDebounceOpt,
    renderDebounce: renderDebounceOpt,
    logger,
  } = opts ?? {};

  // Recreate the instance intentionally when resetKey changes.
  const rrstack = useMemo(() => new RRStack(json), [resetKey]);
  // Refs for current instance and façade
  const rrstackRef = useRef(rrstack);
  rrstackRef.current = rrstack;
  const facadeRef = useRef<RRStack>(rrstack);

  // Logging helper
  const log = useCallback(
    (
      type:
        | 'init'
        | 'reset'
        | 'mutate'
        | 'commit'
        | 'flushChanges'
        | 'flushMutations'
        | 'flushRender'
        | 'cancel',
    ) => {
      if (!logger) return;
      const payload = { type, rrstack: rrstackRef.current };
      if (logger === true) {
        console.debug('[rrstack]', {
          type,
          tz: rrstackRef.current.timezone,
          ruleCount: rrstackRef.current.rules.length,
        });
      } else {
        try {
          logger(payload);
        } catch {
          /* noop */
        }
      }
    },
    [logger],
  );

  // Debounced autosave (onChange): trailing is implicit (always true)
  // - Keep latest onChange and debounce config in refs
  // - Keep timer/pending/inWindow in a singleton ref so flushChanges() survives re-renders
  const onChangeRef = useRef<typeof onChange>(onChange);
  onChangeRef.current = onChange;
  const changeCfgRef = useRef<ReturnType<typeof toDebounceCfg> | undefined>(
    toDebounceCfg(changeDebounceOpt, CHANGE_DEBOUNCE_MS),
  );
  changeCfgRef.current = toDebounceCfg(changeDebounceOpt, CHANGE_DEBOUNCE_MS);
  const changeRef = useRef<{
    call: (s: RRStack) => void;
    flush: () => void;
  } | null>(null);
  if (changeRef.current === null) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: RRStack | undefined;
    let inWindow = false;
    const call = (s: RRStack) => {
      const cfg = changeCfgRef.current;
      const cb = onChangeRef.current;
      if (!cb || !cfg) {
        cb?.(s);
        return;
      }
      const { delay, leading } = cfg;
      if (leading && !inWindow) {
        try {
          cb(s);
        } catch {
          /* noop */
        }
      }
      inWindow = true;
      pending = s;
      if (timer) clearTimeout(timer);
      // trailing always true: window end emits latest pending
      timer = setTimeout(() => {
        timer = undefined;
        inWindow = false;
        const p = pending;
        pending = undefined;
        if (p) {
          try {
            onChangeRef.current?.(p);
          } catch {
            /* noop */
          }
        }
      }, delay);
    };
    const flushInner = () => {
      // Emit any pending trailing call immediately.
      if (!pending) return;
      if (timer) clearTimeout(timer);
      timer = undefined;
      const p = pending;
      pending = undefined;
      inWindow = false;
      try {
        onChangeRef.current?.(p);
      } catch {
        /* noop */
      }
    };
    changeRef.current = { call, flush: flushInner };
  }

  // Mutate debounce (UI -> rrstack) with staging façade; trailing always true
  const mutateCfgRef = useRef<ReturnType<typeof toDebounceCfg> | undefined>(
    toDebounceCfg(mutateDebounceOpt, MUTATE_DEBOUNCE_MS),
  );
  mutateCfgRef.current = toDebounceCfg(mutateDebounceOpt, MUTATE_DEBOUNCE_MS);
  const stagingRef = useRef<{ rules?: RuleJson[]; timezone?: string } | null>(
    null,
  );
  const ensureRules = (): RuleJson[] => {
    const staged = stagingRef.current;
    if (staged && Array.isArray(staged.rules)) return staged.rules;
    const next = [...(rrstackRef.current.rules as RuleJson[])];
    stagingRef.current = { ...(stagingRef.current ?? {}), rules: next };
    return next;
  };
  const stageTimezone = (tz: string) => {
    stagingRef.current = { ...(stagingRef.current ?? {}), timezone: tz };
  };
  // Commit staged changes now
  const commitNow = () => {
    const staged = stagingRef.current;
    if (!staged) return;
    const patch: Partial<Pick<RRStackOptions, 'timezone' | 'rules'>> = {};
    if (staged.timezone !== undefined) patch.timezone = staged.timezone;
    if (staged.rules !== undefined) patch.rules = staged.rules;
    stagingRef.current = null;
    if (Object.keys(patch).length > 0) {
      rrstackRef.current.updateOptions(patch);
      log('commit');
    }
  };
  // Debounce commit
  const mutRef = useRef<{
    schedule: () => void;
    flush: () => void;
    cancel: () => void;
  } | null>(null);
  if (mutRef.current === null) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inWindow = false;
    const schedule = () => {
      const cfg = mutateCfgRef.current;
      if (!cfg) {
        commitNow();
        return;
      }
      const { delay, leading } = cfg;
      if (leading && !inWindow) {
        commitNow();
      }
      inWindow = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        inWindow = false;
        commitNow();
      }, delay);
    };
    const flush = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      inWindow = false;
      commitNow();
    };
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      inWindow = false;
      stagingRef.current = null;
    };
    mutRef.current = { schedule, flush, cancel };
  }

  // Debounced RENDER (rrstack -> UI version bump)
  const renderCfgRef = useRef<ReturnType<typeof toDebounceCfg> | undefined>(
    toDebounceCfg(renderDebounceOpt, RENDER_DEBOUNCE_MS),
  );
  renderCfgRef.current = toDebounceCfg(renderDebounceOpt, RENDER_DEBOUNCE_MS);
  const renderDebounceRef = useRef<{
    bump: (cb: () => void) => void;
    flush: () => void;
  } | null>(null);
  if (renderDebounceRef.current === null) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inWindow = false;
    let lastCb: (() => void) | undefined;
    const run = () => {
      try {
        lastCb?.();
      } catch {
        /* noop */
      }
    };
    const bump = (cb: () => void) => {
      const cfg = renderCfgRef.current;
      if (!cfg) {
        // immediate render
        lastCb = cb;
        run();
        return;
      }
      const { delay, leading } = cfg;
      lastCb = cb;
      if (leading && !inWindow) {
        run();
      }
      inWindow = true;
      if (timer) clearTimeout(timer);
      // Always perform a trailing paint at window end
      timer = setTimeout(() => {
        timer = undefined;
        inWindow = false;
        run();
      }, delay);
    };
    const flushRender = () => {
      const cfg = renderCfgRef.current;
      if (!cfg) {
        // already immediate mode; nothing pending
        return;
      }
      if (timer) clearTimeout(timer);
      timer = undefined;
      inWindow = false;
      run();
    };
    renderDebounceRef.current = { bump, flush: flushRender };
  }
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
            renderDebounceRef.current!.bump(bumpOnce);
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
    // Staged getters overlay timezone/rules; mutators schedule commit
    const proxy = new Proxy(rrstackRef.current as unknown as object, {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      get(_target, prop, _receiver) {
        if (prop === 'rules') {
          return stagingRef.current?.rules ?? rrstackRef.current.rules;
        }
        if (prop === 'timezone') {
          return stagingRef.current?.timezone ?? rrstackRef.current.timezone;
        }
        if (prop === 'toJson') {
          return () => {
            const snap = rrstackRef.current.toJson();
            const tz = stagingRef.current?.timezone;
            const rules = stagingRef.current?.rules;
            return {
              ...snap,
              ...(tz !== undefined ? { timezone: tz } : null),
              ...(rules !== undefined ? { rules } : null),
            };
          };
        }
        // Mutators (stage + schedule)
        if (prop === 'updateOptions') {
          return (p: Partial<Pick<RRStackOptions, 'timezone' | 'rules'>>) => {
            if (p.timezone !== undefined) stageTimezone(p.timezone);
            if (p.rules !== undefined) {
              stagingRef.current = {
                ...(stagingRef.current ?? {}),
                rules: [...p.rules],
              };
            }
            mutRef.current!.schedule();
          };
        }
        if (prop === 'addRule') {
          return (rule: RuleJson, index?: number) => {
            const arr = ensureRules();
            if (index === undefined) arr.push(rule);
            else arr.splice(index, 0, rule);
            mutRef.current!.schedule();
          };
        }
        if (prop === 'removeRule') {
          return (i: number) => {
            const arr = ensureRules();
            arr.splice(i, 1);
            mutRef.current!.schedule();
          };
        }
        if (prop === 'swap') {
          return (i: number, j: number) => {
            const arr = ensureRules();
            [arr[i], arr[j]] = [arr[j], arr[i]];
            mutRef.current!.schedule();
          };
        }
        if (prop === 'up') {
          return (i: number) => {
            const arr = ensureRules();
            if (i <= 0 || i >= arr.length) return;
            [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
            mutRef.current!.schedule();
          };
        }
        if (prop === 'down') {
          return (i: number) => {
            const arr = ensureRules();
            if (i < 0 || i >= arr.length - 1) return;
            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
            mutRef.current!.schedule();
          };
        }
        if (prop === 'top') {
          return (i: number) => {
            const arr = ensureRules();
            if (i <= 0 || i >= arr.length) return;
            const [r] = arr.splice(i, 1);
            arr.unshift(r);
            mutRef.current!.schedule();
          };
        }
        if (prop === 'bottom') {
          return (i: number) => {
            const arr = ensureRules();
            if (i < 0 || i >= arr.length - 1) return;
            const [r] = arr.splice(i, 1);
            arr.push(r);
            mutRef.current!.schedule();
          };
        }
        // fall through to real instance

        return (rrstackRef.current as unknown as Record<PropertyKey, unknown>)[
          prop
        ];
      },
      set(_target, prop, value) {
        if (prop === 'timezone' && typeof value === 'string') {
          stageTimezone(value);
          mutRef.current!.schedule();
          return true;
        }
        if (prop === 'rules' && Array.isArray(value)) {
          stagingRef.current = {
            ...(stagingRef.current ?? {}),
            rules: [...(value as RuleJson[])],
          };
          mutRef.current!.schedule();
          return true;
        }
        // block unknown direct sets to keep façade deterministic
        return false;
      },
    }) as unknown as RRStack;
    facadeRef.current = proxy;
  }, [rrstack]);
  const flushChanges = useCallback(() => {
    changeRef.current!.flush();
    log('flushChanges');
  }, [log]);
  const flushMutations = useCallback(() => {
    mutRef.current!.flush();
    log('flushMutations');
  }, [log]);
  const cancelMutations = useCallback(() => {
    mutRef.current!.cancel();
    log('cancel');
  }, [log]);
  const flushRender = useCallback(() => {
    renderDebounceRef.current!.flush();
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
