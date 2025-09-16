import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

describe('getSegments limit option', () => {
  it('throws when the yielded segment count would exceed the limit', () => {
    // Active 05:00–06:00 with blackout 05:30–05:45 creates 3 segments.
    const act: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
    };
    const blk: RuleJson = {
      effect: 'blackout',
      duration: { minutes: 15 },
      options: { freq: 'daily', byhour: [5], byminute: [30], bysecond: [0] },
    };
    const stack = new RRStack({ timezone: 'UTC', rules: [act, blk] });
    const day = Date.UTC(2024, 0, 2);
    const from = day + 5 * 3600 * 1000;
    const to = day + 6 * 3600 * 1000;
    expect(() => [...stack.getSegments(from, to, { limit: 2 })]).toThrow();
  });

  it('respects the limit when exactly met', () => {
    // Single rule: yields exactly one segment over the window.
    const act: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
    };
    const stack = new RRStack({ timezone: 'UTC', rules: [act] });
    const day = Date.UTC(2024, 0, 2);
    const from = day + 5 * 3600 * 1000;
    const to = day + 6 * 3600 * 1000;
    const segs = [...stack.getSegments(from, to, { limit: 1 })];
    expect(segs.length).toBe(1);
    expect(segs[0]?.status).toBe('active');
    expect(segs[0]?.start).toBe(from);
    expect(segs[0]?.end).toBe(to);
  });
});
