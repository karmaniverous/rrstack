import { useMemo, useRef, useSyncExternalStore } from 'react';

import type { RRStack } from '../rrstack/RRStack';

/**
 * Subscribe to an RRStack-derived value. The selector is re-evaluated on
 * stack mutations, and the component only re-renders when `isEqual` deems the
 * derived value to have changed.
 */
export function useRRStackSelector<T>(
  rrstack: RRStack,
  selector: (s: RRStack) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  // Compute initial snapshot for the current instance.
  const initial = useMemo(() => selector(rrstack), [rrstack, selector]);
  const cacheRef = useRef<T>(initial);
  // Keep cache in sync when the rrstack instance changes.
  cacheRef.current = initial;

  const subscribe = (cb: () => void) =>
    rrstack.subscribe(() => {
      const next = selector(rrstack);
      if (!isEqual(cacheRef.current, next)) {
        cacheRef.current = next;
        try {
          cb();
        } catch {
          /* noop */
        }
      }
    });

  const getSnapshot = () => cacheRef.current;

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
