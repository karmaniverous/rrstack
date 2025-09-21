import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import { RRStack } from '../rrstack/RRStack';
import type { RRStackOptions } from '../rrstack/types';
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
): { rrstack: RRStack; version: number; flush: () => void } {
  const { resetKey, debounce: debounceOpt, logger } = opts ?? {};

  // Recreate the instance intentionally when resetKey changes.
  const rrstack = useMemo(() => new RRStack(json), [resetKey]);

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
          versionRef.current++;
          try {
            reactCb();
          } catch {
            /* noop */
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
  return { rrstack, version, flush };
}
