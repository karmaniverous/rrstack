import type { RefObject } from 'react';

import type { DebounceCfgNormalized } from './debounce.util';

export interface RenderBumper {
  bump: (cb: () => void) => void;
  flush: () => void;
}

/**
 * Debounce version bumps to coalesce renders. Trailing is always true.
 */
export const createRenderBumper = (
  cfgRef: RefObject<DebounceCfgNormalized | undefined>,
): RenderBumper => {
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
    const cfg = cfgRef.current;
    if (!cfg) {
      lastCb = cb;
      run();
      return;
    }
    const { delay, leading } = cfg;
    lastCb = cb;
    if (leading && !inWindow) run();
    inWindow = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      inWindow = false;
      run();
    }, delay);
  };
  const flush = () => {
    if (!cfgRef.current) return;
    if (timer) clearTimeout(timer);
    timer = undefined;
    inWindow = false;
    run();
  };
  return { bump, flush };
};
