import { describe, expect, it } from 'vitest';
import { EPOCH_MIN_MS, EPOCH_MAX_MS } from './types';

describe('types', () => {
  it('exports domain constants', () => {
    expect(EPOCH_MIN_MS).toBe(0);
    expect(EPOCH_MAX_MS).toBeGreaterThan(EPOCH_MIN_MS);
  });
});
