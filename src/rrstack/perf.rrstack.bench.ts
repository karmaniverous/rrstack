import { RRule } from 'rrule';
import { bench, describe } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

// Baseline active (open-ended; fast probe paths)
const baselineActive = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'active',
});

// Daily open-end: finite earliest; open end. Use blackout baseline to avoid open-start.
const dailyOpenRule: RuleJson = {
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
const dailyOpen = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'blackout',
  rules: [dailyOpenRule],
});

// Daily closed-sided window (~30 days)
const starts30 = Date.UTC(2024, 0, 10, 0, 0, 0);
const ends30 = Date.UTC(2024, 1, 9, 0, 0, 0);
const dailyClosedRule: RuleJson = {
  effect: 'active',
  duration: { hours: 1 },
  options: {
    freq: 'daily',
    byhour: [5],
    byminute: [0],
    bysecond: [0],
    starts: starts30,
    ends: ends30,
  },
};
const dailyClosed = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'active',
  rules: [dailyClosedRule],
});

// Monthly 3rd Tuesday (open-end), blackout baseline to ensure finite earliest
const monthlyNthRule: RuleJson = {
  effect: 'active',
  duration: { hours: 1 },
  options: {
    freq: 'monthly',
    bysetpos: 3,
    byweekday: [RRule.TU],
    byhour: [5],
    byminute: [0],
    bysecond: [0],
    starts: Date.UTC(2024, 0, 1, 0, 0, 0),
  },
};
const monthlyNth = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'blackout',
  rules: [monthlyNthRule],
});

// Baseline-active sample times for isActiveAt
const day = Date.UTC(2024, 0, 10);
const samples: number[] = Array.from(
  { length: 100 },
  (_, i) => day + i * 3600 * 1000,
);
let idx = 0;

// Daily window for getSegments/classifyRange
const dailyStack = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'active',
  rules: [dailyOpenRule],
});
const from = day + 0 * 3600 * 1000;
const to = day + 24 * 3600 * 1000;

describe('RRStack benchmarks (vitest bench)', () => {
  bench('getEffectiveBounds — baseline active (no rules)', () => {
    baselineActive.getEffectiveBounds();
  });

  bench('getEffectiveBounds — daily open-end', () => {
    dailyOpen.getEffectiveBounds();
  });

  bench('getEffectiveBounds — daily closed-sided 30d', () => {
    dailyClosed.getEffectiveBounds();
  });

  bench('getEffectiveBounds — monthly 3rd Tuesday (open-end)', () => {
    monthlyNth.getEffectiveBounds();
  });

  bench('isActiveAt — baseline active', () => {
    const t = samples[idx++ % samples.length];
    baselineActive.isActiveAt(t);
  });

  bench('getSegments — daily rule over 1-day window', () => {
    // Consume iterator; still streaming and tiny
    let acc = 0;
    for (const seg of dailyStack.getSegments(from, to)) {
      acc += seg.end - seg.start;
    }
    // Accumulate to avoid dead-code elimination
    if (acc < 0) throw new Error('impossible');
  });

  bench('classifyRange — daily hour + baseline active', () => {
    dailyStack.classifyRange(day + 4 * 3600 * 1000, day + 6 * 3600 * 1000);
  });
});
