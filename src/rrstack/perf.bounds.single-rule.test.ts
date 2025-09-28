import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

describe('perf (sanity, always-on): baseline + single rule shapes', () => {
  it('baseline active (no rules): bounds are open-sided', () => {
    const s = new RRStack({ timezone: 'UTC', defaultEffect: 'active' });
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    expect(b.start).toBeUndefined();
    expect(b.end).toBeUndefined();
  });

  it('single daily active (open end): bounds have finite start and open end', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        // starts clamp; no ends => open end
        starts: Date.UTC(2024, 0, 10, 0, 0, 0),
      },
    };
    const s = new RRStack({
      timezone: 'UTC',
      // blackout baseline ensures earliest is finite (no open-start baseline)
      defaultEffect: 'blackout',
      rules: [rule],
    });
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    expect(typeof b.start).toBe('number');
    expect(b.end).toBeUndefined();
  });
});
