import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

describe('span rules (continuous coverage)', () => {
  it('active span (ms): covers [start, end) and yields a single segment', () => {
    const start = Date.UTC(2024, 0, 10, 5, 0, 0);
    const end = Date.UTC(2024, 0, 10, 7, 0, 0);
    const span: RuleJson = {
      effect: 'active',
      // duration omitted for span
      options: { starts: start, ends: end },
    };
    const s = new RRStack({ timezone: 'UTC', rules: [span] });
    expect(s.isActiveAt(start)).toBe(true);
    expect(s.isActiveAt(start + 30 * 60 * 1000)).toBe(true);
    expect(s.isActiveAt(end - 1)).toBe(true);
    expect(s.isActiveAt(end)).toBe(false);

    const segs = [...s.getSegments(start, end)];
    expect(segs).toEqual([{ start, end, status: 'active' }]);

    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    expect(b.start).toBe(start);
    expect(b.end).toBe(end);
  });

  it("seconds mode: active span uses integer comparisons (no rounding needed)", () => {
    const start = Math.trunc(Date.UTC(2024, 0, 10, 5, 0, 0) / 1000);
    const end = Math.trunc(Date.UTC(2024, 0, 10, 5, 1, 30) / 1000);
    const span: RuleJson = {
      effect: 'active',
      options: { starts: start, ends: end },
    };
    const s = new RRStack({ timezone: 'UTC', timeUnit: 's', rules: [span] });
    expect(s.isActiveAt(start)).toBe(true);
    expect(s.isActiveAt(end - 1)).toBe(true);
    expect(s.isActiveAt(end)).toBe(false);
    const b = s.getEffectiveBounds();
    expect(b.start).toBe(start);
    expect(b.end).toBe(end);
  });

  it('blackout span overrides a recurring active slice in the cascade', () => {
    const day = Date.UTC(2024, 0, 10);
    const baseActive: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
    };
    // blackout from 05:15–05:45 on the day
    const blkStart = day + 5 * 3600 * 1000 + 15 * 60 * 1000;
    const blkEnd = day + 5 * 3600 * 1000 + 45 * 60 * 1000;
    const spanBlk: RuleJson = {
      effect: 'blackout',
      options: { starts: blkStart, ends: blkEnd },
    };
    const s = new RRStack({ timezone: 'UTC', rules: [baseActive, spanBlk] });
    const from = day + 5 * 3600 * 1000;
    const to = day + 6 * 3600 * 1000;
    const segs = [...s.getSegments(from, to)];
    expect(segs).toEqual([
      { start: from, end: blkStart, status: 'active' },
      { start: blkStart, end: blkEnd, status: 'blackout' },
      { start: blkEnd, end: to, status: 'active' },
    ]);
  });
});
