import type { MutableRefObject } from 'react';

import type { RRStack } from '../rrstack/RRStack';
import type { DebounceCfgNormalized } from './debounce.util';

export interface ChangeEmitter {
  call: (s: RRStack) => void;
  flush: () => void;
}

/**
 * Debounce onChange (autosave). Trailing is always true by design.
 */
export const createChangeEmitter = (
  onChangeRef: MutableRefObject<((s: RRStack) => void) | undefined>,
  cfgRef: MutableRefObject<DebounceCfgNormalized | undefined>,
): ChangeEmitter => {
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
    timer = setTimeout(() => {
      timer = undefined;
      inWindow = false;
      const p = pending;
      pending = undefined;
      if (p) onChangeRef.current?.(p);
    }, delay);
  };

  const flush = () => {
    if (!pending) return;
    if (timer) clearTimeout(timer);
    timer = undefined;
    inWindow = false;
    onChangeRef.current?.(pending);
    pending = undefined;
  };
  return { call, flush };
};
