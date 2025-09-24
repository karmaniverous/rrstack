// Debounce option shape:
// - true: use default delay (leading false)
// - number: explicit delay (leading false)
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
