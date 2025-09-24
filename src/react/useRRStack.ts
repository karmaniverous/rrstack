import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import { RRStack } from '../rrstack/RRStack';
import type { RRStackOptions, RuleJson } from '../rrstack/types';
export type DebounceOption =
  | number
  | {
      delay: number;
      leading?: boolean;
      trailing?: boolean;
    };

interface Options {
  resetKey?: string | number;
  debounce?: DebounceOption;
  /**
   * Debounce UI → rrstack applies (coalesce frequent rrstack.updateOptions calls).
   * - Provide delay/leading/trailing semantics (default immediate: no debounce).
   */
  applyDebounce?: DebounceOption;
  /**
   * Debounce rrstack → UI renders (coalesce version bumps from notify).
   * - Provide delay/leading/trailing semantics (default immediate: no debounce).
   */
  renderDebounce?: DebounceOption;
  logger?:
    | boolean
    | ((e: {
        type: 'init' | 'reset' | 'mutate' | 'flush';
        rrstack: RRStack;
      }) => void);
}

const toDebounceCfg = (
  v: DebounceOption | undefined,
): { delay: number; leading: boolean; trailing: boolean } | undefined => {
  if (v === undefined) return undefined;
  if (typeof v === 'number') {
    return { delay: v, leading: false, trailing: true };
  }
  const { delay, leading = false, trailing = true } = v;
  return { delay, leading, trailing };
};

export function useRRStack(
  json: RRStackOptions,
  onChange?: (stack: RRStack) => void,
  opts?: Options,
): {
  rrstack: RRStack;
  version: number;
  flush: () => void;
  apply: (p: { timezone?: string; rules?: RuleJson[] }) => void;
  flushApply: () => void;
  flushRender: () => void;
} {
  const {
    resetKey,
    debounce: debounceOpt,
    applyDebounce: applyDebounceOpt,
    renderDebounce: renderDebounceOpt,
    logger,
  } = opts ?? {};

  // Recreate the instance intentionally when resetKey changes.
  const rrstack = useMemo(() => new RRStack(json), [resetKey]);
  // Keep a ref to the current instance for debounced helpers that outlive renders.
  const rrstackRef = useRef(rrstack);
  rrstackRef.current = rrstack;

  // Logging helper
  const log = useCallback(
    (type: 'init' | 'reset' | 'mutate' | 'flush') => {
      if (!logger) return;
      const payload = { type, rrstack };
      if (logger === true) {
        console.debug('[rrstack]', {
          type,
          tz: rrstack.timezone,
          ruleCount: rrstack.rules.length,
        });
      } else {
        try {
          logger(payload);
        } catch {
          /* noop */
        }
      }
    },
    [logger, rrstack],
  );

  // Stable debounced wrapper across renders:
  // - Keep latest onChange and debounce config in refs
  // - Keep timer/pending/inWindow in a singleton ref so flush() survives re-renders
  const onChangeRef = useRef<typeof onChange>(onChange);
  onChangeRef.current = onChange;
  const cfgRef = useRef<ReturnType<typeof toDebounceCfg> | undefined>(
    toDebounceCfg(debounceOpt),
  );
  cfgRef.current = toDebounceCfg(debounceOpt);
  const debouncedRef = useRef<{
    call: (s: RRStack) => void;
    flush: () => void;
  } | null>(null);
  if (debouncedRef.current === null) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: RRStack | undefined;
    let inWindow = false;
    const call = (s: RRStack) => {
      const cfg = cfgRef.current;
      const cb = onChangeRef.current;
      if (!cb || !cfg) {
        cb?.(s);
        return;
      }
      const { delay, leading, trailing } = cfg;
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
      if (trailing) {
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
      } else {
        // trailing disabled: schedule window end only
        timer = setTimeout(() => {
          timer = undefined;
          inWindow = false;
          pending = undefined;
        }, delay);
      }
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
    debouncedRef.current = { call, flush: flushInner };
  }

  // Debounced APPLY (UI -> rrstack.updateOptions)
  const applyCfgRef = useRef<ReturnType<typeof toDebounceCfg> | undefined>(
    toDebounceCfg(applyDebounceOpt),
  );
  applyCfgRef.current = toDebounceCfg(applyDebounceOpt);
  const debouncedApplyRef = useRef<{
    call: (p: { timezone?: string; rules?: RuleJson[] }) => void;
    flush: () => void;
  } | null>(null);
  if (debouncedApplyRef.current === null) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inWindow = false;
    // latest-wins per field during the window
    let pendingTz: string | undefined;
    let pendingRules: RuleJson[] | undefined;
    const applyNow = (tz?: string, rules?: RuleJson[]) => {
      const patch: Partial<Pick<RRStackOptions, 'timezone' | 'rules'>> = {};
      if (tz !== undefined) patch.timezone = tz;
      if (rules !== undefined) patch.rules = rules;
      if (Object.keys(patch).length > 0) {
        try {
          rrstackRef.current.updateOptions(patch);
        } catch {
          /* noop */
        }
      }
    };
    const call = (p: { timezone?: string; rules?: RuleJson[] }) => {
      const cfg = applyCfgRef.current;
      // Merge latest fields
      if (p.timezone !== undefined) pendingTz = p.timezone;
      if (p.rules !== undefined) pendingRules = p.rules;
      if (!cfg) {
        applyNow(p.timezone, p.rules);
        // clear any pending
        pendingTz = undefined;
        pendingRules = undefined;
        return;
      }
      const { delay, leading, trailing } = cfg;
      if (leading && !inWindow) {
        applyNow(pendingTz, pendingRules);
        pendingTz = undefined;
        pendingRules = undefined;
      }
      inWindow = true;
      if (timer) clearTimeout(timer);
      if (trailing) {
        timer = setTimeout(() => {
          timer = undefined;
          inWindow = false;
          // apply the latest pending
          applyNow(pendingTz, pendingRules);
          pendingTz = undefined;
          pendingRules = undefined;
        }, delay);
      } else {
        // trailing disabled: just end window later; no second apply
        timer = setTimeout(() => {
          timer = undefined;
          inWindow = false;
          pendingTz = undefined;
          pendingRules = undefined;
        }, delay);
      }
    };
    const flushApply = () => {
      const tz = pendingTz;
      const rules = pendingRules;
      pendingTz = undefined;
      pendingRules = undefined;
      if (timer) clearTimeout(timer);
      timer = undefined;
      inWindow = false;
      applyNow(tz, rules);
    };
    debouncedApplyRef.current = { call, flush: flushApply };
  }

  // Debounced RENDER (rrstack -> UI version bump)
  const renderCfgRef = useRef<ReturnType<typeof toDebounceCfg> | undefined>(
    toDebounceCfg(renderDebounceOpt),
  );
  renderCfgRef.current = toDebounceCfg(renderDebounceOpt);
  const renderDebounceRef = useRef<{
    bump: (cb: () => void) => void;
    flush: () => void;
  } | null>(null);
  if (renderDebounceRef.current === null) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inWindow = false;
    let pending = false;
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
      const { delay, leading, trailing } = cfg;
      lastCb = cb;
      if (leading && !inWindow) {
        run();
      } else {
        pending = true;
      }
      inWindow = true;
      if (timer) clearTimeout(timer);
      // window end
      timer = setTimeout(() => {
        timer = undefined;
        const shouldRun = trailing && pending;
        pending = false;
        inWindow = false;
        if (shouldRun) run();
      }, delay);
    };
    const flushRender = () => {
      const cfg = renderCfgRef.current;
      if (!cfg) return; // already immediate mode
      if (timer) clearTimeout(timer);
      timer = undefined;
      pending = false;
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
            debouncedRef.current!.call(rrstack);
          } catch {
            /* noop */
          } // bump snapshot and then notify React
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
      [rrstack, log],
    ),
    () => versionRef.current,
    () => 0,
  );

  useEffect(() => {
    if (resetKey !== undefined) log('reset');
  }, [resetKey, log]);

  const flush = useCallback(() => {
    debouncedRef.current!.flush();
    log('flush');
  }, [log]);
  const apply = useCallback((p: { timezone?: string; rules?: RuleJson[] }) => {
    debouncedApplyRef.current!.call(p);
  }, []);
  const flushApply = useCallback(() => {
    debouncedApplyRef.current!.flush();
  }, []);
  const flushRender = useCallback(() => {
    renderDebounceRef.current!.flush();
  }, []);
  return { rrstack, version, flush, apply, flushApply, flushRender };
}
