/**
 * Tiny helpers for boundary selection across multiple rule streams.
 * These scan arrays and pick the next min/max number (ignoring undefined).
 * Kept simple and dependency-free.
 */

export const minBoundary = (
  starts: Array<number | undefined>,
  ends: Array<number | undefined>,
): number | undefined => {
  let t: number | undefined = undefined;
  const consider = (v: number | undefined) => {
    if (typeof v !== 'number') return;
    if (t === undefined || v < t) t = v;
  };
  for (let i = 0; i < starts.length; i++) consider(starts[i]);
  for (let i = 0; i < ends.length; i++) consider(ends[i]);
  return t;
};

export const maxBoundary = (
  starts: Array<number | undefined>,
  ends: Array<number | undefined>,
): number | undefined => {
  let t: number | undefined = undefined;
  const consider = (v: number | undefined) => {
    if (typeof v !== 'number') return;
    if (t === undefined || v > t) t = v;
  };
  for (let i = 0; i < starts.length; i++) consider(starts[i]);
  for (let i = 0; i < ends.length; i++) consider(ends[i]);
  return t;
};
