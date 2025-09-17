import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

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
  resetKey?: string | number;  debounce?: DebounceOption;
  logger?:
    | boolean
    | ((e: { type: 'init' | 'reset' | 'mutate' | 'flush'; rrstack: RRStack }) => void);
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

  // Debounced onChange wrapper (leading/trailing policy).
  const debounced = useMemo(() => {
    const cfg = toDebounceCfg(debounceOpt);
    if (!onChange || !cfg) {
      return {
        call: (s: RRStack) => onChange?.(s),
        flush: () => {
          /* noop */
        },
      };
    }
    const { delay, leading, trailing } = cfg;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: RRStack | undefined;
    let inWindow = false;

    const call = (s: RRStack) => {
      // leading: fire immediately if not in window
      if (leading && !inWindow) {
        try {
          onChange(s);
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
              onChange(p);
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

    const flush = () => {
      // Emit any pending trailing call immediately. The presence of a pending
      // value is authoritative; the timer handle may be absent when using fake
      // timers or after clock adjustments.
      if (!pending) return;
      if (timer) clearTimeout(timer);
      timer = undefined;
      const p = pending;
      pending = undefined;
      inWindow = false;
      try {
        onChange(p);
      } catch {
        /* noop */
      }
    };

    return { call, flush };
  }, [debounceOpt, onChange]);
  // React external-store binding: one React-level subscriber per hook instance.
  // Use a monotonic counter for the snapshot; Date.now() can be frozen by fake timers.
  const versionRef = useRef(0);
  const version = useSyncExternalStore(
    useCallback(
      (reactCb) => {
        log('init');
        const unsub = rrstack.subscribe(() => {
          // bump snapshot first so React sees a changed value
          versionRef.current++;
          // notify React
          try {
            reactCb();
          } catch {
            /* noop */
          }
          // call debounced onChange & log
          try {
            debounced.call(rrstack);
          } catch {
            /* noop */
          }
          log('mutate');
        });
        return () => {
          unsub();
        };
      },
      [rrstack, debounced, log],
    ),
    () => versionRef.current,
    () => 0,
  );

  useEffect(() => {
    if (resetKey !== undefined) log('reset');  }, [resetKey, log]);

  const flush = useCallback(() => {
    debounced.flush();
    log('flush');
  }, [debounced, log]);
  return { rrstack, version, flush };
}
