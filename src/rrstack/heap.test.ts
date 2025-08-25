import { describe, expect, it } from 'vitest';

import { maxBoundary, minBoundary } from './util/heap';

describe('util/heap boundary helpers', () => {
  it('minBoundary picks the smallest defined among starts and ends', () => {
    expect(minBoundary([2, undefined], [undefined, 10])).toBe(2);
    expect(minBoundary([undefined, undefined], [5, 3])).toBe(3);
    expect(minBoundary([undefined], [undefined])).toBeUndefined();
  });

  it('maxBoundary picks the largest defined among starts and ends', () => {
    expect(maxBoundary([2, undefined], [undefined, 10])).toBe(10);
    expect(maxBoundary([undefined, 7], [5, 3])).toBe(7);
    expect(maxBoundary([undefined], [undefined])).toBeUndefined();
  });
});
