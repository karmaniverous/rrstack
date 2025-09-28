import { RRule } from 'rrule';
import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

/**
 * Perf/benchmarks for key algorithms under common workloads.
 *
 * Notes
 * - Skipped by default to avoid CI flakiness and slow runs.
 * - Enable locally by setting BENCH=1 (Linux/macOS) or $env:BENCH=1 (PowerShell).
 * - Optionally control iteration count via ITERS (default 2000).
 *
 * Examples:
 *   BENCH=1 vitest --run src/rrstack/perf.bounds.single-rule.test.ts
 *   $env:BENCH=1; vitest --run src/rrstack/perf.bounds.single-rule.test.ts
 */

const BENCH = process.env.BENCH === '1';
const ITERS = Math.max(1, Number(process.env.ITERS ?? '2000'));

const benchDescribe = BENCH ? describe : describe.skip;

const tick = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

function bench(
  label: string,
  fn: () => void,
  iters = ITERS,
): {
  label: string;
  iters: number;
  ms: number;
  opsPerSec: number;
} {
  // Warmup
  for (let i = 0; i < 100; i++) fn();

  const t0 = tick();
  for (let i = 0; i < iters; i++) fn();
  const t1 = tick();
  const ms = t1 - t0;
  const opsPerSec = (iters / (ms || 1)) * 1000;

  console.log(
    `[bench] ${label}: ${String(iters)} iters in ${ms.toFixed(2)} ms → ${opsPerSec.toFixed(0)} ops/s`,
  );
  return { label, iters, ms, opsPerSec };
}

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
      defaultEffect: 'blackout', // ensure earliest start is finite (baseline doesn't make cascade open-start)
      rules: [rule],
    });
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    // For this shape we expect a concrete first occurrence and an open end.
    expect(typeof b.start).toBe('number');
    expect(b.end).toBeUndefined();
  });
});

benchDescribe('perf (BENCH=1): baseline + single-rule combinations', () => {
  it('getEffectiveBounds — baseline active (no rules)', () => {
    const s = new RRStack({ timezone: 'UTC', defaultEffect: 'active' });
    const r = bench('getEffectiveBounds (baseline active)', () => {
      const b = s.getEffectiveBounds();
      // light assert to keep the optimizer honest
      if (b.empty) throw new Error('unexpected empty');
    });
    expect(r.iters).toBe(ITERS);
  });

  it('getEffectiveBounds — single daily active (open end)', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        starts: Date.UTC(2024, 0, 10, 0, 0, 0),
      },
    };
    const s = new RRStack({
      timezone: 'UTC',
      defaultEffect: 'active',
      rules: [rule],
    });
    const r = bench('getEffectiveBounds (daily open-end)', () => {
      const b = s.getEffectiveBounds();
      if (b.end !== undefined) throw new Error('expected open end');
    });
    expect(r.iters).toBe(ITERS);
  });

  it('getEffectiveBounds — single daily active (closed 30-day window)', () => {
    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
    const ends = Date.UTC(2024, 1, 9, 0, 0, 0);
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        starts,
        ends,
      },
    };
    const s = new RRStack({
      timezone: 'UTC',
      defaultEffect: 'active',
      rules: [rule],
    });
    const r = bench('getEffectiveBounds (daily closed-sided 30d)', () => {
      const b = s.getEffectiveBounds();
      if (b.end === undefined) throw new Error('expected finite end');
    });
    expect(r.iters).toBe(ITERS);
  });

  it('isActiveAt — baseline active', () => {
    const s = new RRStack({ timezone: 'UTC', defaultEffect: 'active' });
    const day = Date.UTC(2024, 0, 10);
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) samples.push(day + i * 3600 * 1000);
    let idx = 0;
    const r = bench('isActiveAt (baseline active)', () => {
      const t = samples[idx++ % samples.length];
      if (!s.isActiveAt(t)) throw new Error('expected active');
    });
    expect(r.iters).toBe(ITERS);
  });

  it('getEffectiveBounds — monthly 3rd Tuesday (open end)', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        bysetpos: 3,
        byweekday: [RRule.TU],
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        // anchor cadence from a known month; open end
        starts: Date.UTC(2024, 0, 1, 0, 0, 0),
      },
    };
    const s = new RRStack({
      timezone: 'UTC',
      // blackout baseline ensures earliest is finite while end remains open
      defaultEffect: 'blackout',
      rules: [rule],
    });
    const r = bench('getEffectiveBounds (monthly 3rd Tue open-end)', () => {
      const b = s.getEffectiveBounds();
      if (b.end !== undefined) throw new Error('expected open end');
    });
    expect(r.iters).toBe(ITERS);
  });

  it('getSegments — single daily active over a day', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const s = new RRStack({
      timezone: 'UTC',
      defaultEffect: 'active',
      rules: [rule],
    });
    const day = Date.UTC(2024, 0, 10);
    const from = day + 0 * 3600 * 1000;
    const to = day + 24 * 3600 * 1000;
    const r = bench('getSegments (daily rule; 1-day window)', () => {
      // consume the iterator (tiny)
      let acc = 0;
      for (const seg of s.getSegments(from, to)) {
        acc += seg.end - seg.start;
      }
      // retain a trivial dependency
      if (acc <= 0) throw new Error('unexpected empty accumulation');
    });
    expect(r.iters).toBe(ITERS);
  });

  it('classifyRange — daily active hour vs baseline active', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
      },
    };
    const s = new RRStack({
      timezone: 'UTC',
      defaultEffect: 'active',
      rules: [rule],
    });
    const day = Date.UTC(2024, 0, 10);
    const from = day + 4 * 3600 * 1000;
    const to = day + 6 * 3600 * 1000;
    const r = bench('classifyRange (daily hour + baseline active)', () => {
      const status = s.classifyRange(from, to);
      if (status !== 'partial') throw new Error('expected partial');
    });
    expect(r.iters).toBe(ITERS);
  });
});
