/**
 * Tiny helpers for boundary selection across multiple rule streams.
 * These scan arrays and pick the next min/max number (ignoring undefined).
 * Kept simple and dependency-free.
 */

export const minBoundary = (
  starts: (number | undefined)[],
  ends: (number | undefined)[],
): number | undefined => {
  let t: number | undefined = undefined;
  const consider = (v: number | undefined) => {
    if (typeof v !== 'number') return;
    if (t === undefined || v < t) t = v;
  };
  for (const v of starts) consider(v);
  for (const v of ends) consider(v);
  return t;
};

export const maxBoundary = (
  starts: (number | undefined)[],
  ends: (number | undefined)[],
): number | undefined => {
  let t: number | undefined = undefined;
  const consider = (v: number | undefined) => {
    if (typeof v !== 'number') return;
    if (t === undefined || v > t) t = v;
  };
  for (const v of starts) consider(v);
  for (const v of ends) consider(v);
  return t;
};
