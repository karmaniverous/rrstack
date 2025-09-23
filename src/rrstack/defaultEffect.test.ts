import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

describe('defaultEffect (virtual baseline rule)', () => {
  it("defaultEffect: 'active' with no rules → active everywhere; open-ended bounds", () => {
    const s = new RRStack({ timezone: 'UTC', defaultEffect: 'active' });
    const now = Date.UTC(2024, 0, 2, 0, 0, 0);
    expect(s.isActiveAt(now)).toBe(true);
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    expect(b.start).toBeUndefined();
    expect(b.end).toBeUndefined();
  });

  it("defaultEffect: 'blackout' with no rules → no active coverage; empty bounds", () => {
    const s = new RRStack({ timezone: 'UTC', defaultEffect: 'blackout' });
    const now = Date.UTC(2024, 0, 2, 0, 0, 0);
    expect(s.isActiveAt(now)).toBe(false);
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(true);
    expect(b.start).toBeUndefined();
    expect(b.end).toBeUndefined();
  });

  it("defaultEffect: 'auto' + first rule 'active' → baseline blackout (legacy behavior)", () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
    };
    const s = new RRStack({
      timezone: 'UTC',
      defaultEffect: 'auto',
      rules: [rule],
    });
    const day = Date.UTC(2024, 0, 2);
    // a time outside the 05:00–06:00 active slice should be blackout
    const t = day + 4 * 3600 * 1000; // 04:00
    expect(s.isActiveAt(t)).toBe(false);
  });

  it("defaultEffect: 'auto' + no rules → baseline active", () => {
    const s = new RRStack({ timezone: 'UTC', defaultEffect: 'auto' });
    const day = Date.UTC(2024, 0, 2);
    expect(s.isActiveAt(day)).toBe(true);
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    expect(b.start).toBeUndefined();
    expect(b.end).toBeUndefined();
  });

  it("defaultEffect: 'active' baseline with blackout slice overrides during that window", () => {
    const day = Date.UTC(2024, 0, 10);
    const blk: RuleJson = {
      effect: 'blackout',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
    };
    const s = new RRStack({
      timezone: 'UTC',
      defaultEffect: 'active',
      rules: [blk],
    });
    const before = day + 4 * 3600 * 1000 + 30 * 60 * 1000; // 04:30 → active (baseline)
    const during = day + 5 * 3600 * 1000 + 30 * 60 * 1000; // 05:30 → blackout
    const after = day + 6 * 3600 * 1000 + 1; // just after 06:00 → active again (baseline)
    expect(s.isActiveAt(before)).toBe(true);
    expect(s.isActiveAt(during)).toBe(false);
    expect(s.isActiveAt(after)).toBe(true);
  });

  it('getSegments: baseline active with a blackout slice yields active/blackout/active segments', () => {
    const day = Date.UTC(2024, 0, 10);
    const blk: RuleJson = {
      effect: 'blackout',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
    };
    const s = new RRStack({
      timezone: 'UTC',
      defaultEffect: 'active',
      rules: [blk],
    });
    const from = day + 4 * 3600 * 1000; // 04:00
    const to = day + 6 * 3600 * 1000 + 30 * 60 * 1000; // 06:30
    const segs = [...s.getSegments(from, to)];
    expect(segs).toEqual([
      { start: from, end: day + 5 * 3600 * 1000, status: 'active' },
      {
        start: day + 5 * 3600 * 1000,
        end: day + 6 * 3600 * 1000,
        status: 'blackout',
      },
      { start: day + 6 * 3600 * 1000, end: to, status: 'active' },
    ]);
  });

  it('classifyRange: baseline active shows active or partial appropriately', () => {
    const day = Date.UTC(2024, 0, 10);
    const blk: RuleJson = {
      effect: 'blackout',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
    };
    const s = new RRStack({
      timezone: 'UTC',
      defaultEffect: 'active',
      rules: [blk],
    });
    expect(
      s.classifyRange(
        day + 4 * 3600 * 1000,
        day + 4 * 3600 * 1000 + 30 * 60 * 1000,
      ),
    ).toBe('active');
    expect(s.classifyRange(day + 4 * 3600 * 1000, day + 6 * 3600 * 1000)).toBe(
      'partial',
    );
  });
});
