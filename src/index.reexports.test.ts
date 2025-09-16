import { describe, expect, it } from 'vitest';

import { describeRule, fromIsoDuration, RRStack, toIsoDuration } from './index';

describe('package re-exports (src/index.ts)', () => {
  it('exposes RRStack, duration helpers, and description helper', () => {
    expect(typeof RRStack).toBe('function');
    expect(toIsoDuration({ minutes: 15 })).toBe('PT15M');
    expect(fromIsoDuration('PT15M')).toEqual({ minutes: 15 });
    expect(typeof describeRule).toBe('function');
  });

  it('constructs a working RRStack instance via root index', () => {    const stack = new RRStack({
      timezone: 'UTC',
      rules: [
        {
          effect: 'active' as const,
          duration: { minutes: 30 },
          options: { freq: 'daily', byhour: [12], byminute: [0], bysecond: [0] },
        },
      ],
    });
    const day = Date.UTC(2024, 0, 2);
    const tActive = day + 12 * 3600 * 1000 + 15 * 60 * 1000;
    const tBlackout = day + 11 * 3600 * 1000 + 59 * 60 * 1000;

    expect(stack.isActiveAt(tActive)).toBe(true);
    expect(stack.isActiveAt(tBlackout)).toBe(false);
  });
});