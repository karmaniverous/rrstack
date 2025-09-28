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

// Count-limited daily (finite probe path)
const dailyCountRule: RuleJson = {
  effect: 'active',
  duration: { hours: 1 },
  options: {
    freq: 'daily',
    byhour: [5],
    byminute: [0],
    bysecond: [0],
    starts: Date.UTC(2024, 0, 10, 0, 0, 0),
    count: 30, // finite series
  },
};
const dailyCountLimited = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'blackout',
  rules: [dailyCountRule],
});

// Reverse-sweep stress (ambiguous pre-pass; blackout + later active on probe day)
// Mirrors bounds.more.test "backward fallback path"
const probeStarts = Date.UTC(2090, 0, 1, 0, 0, 0);
const probeEnds = Date.UTC(2100, 1, 1, 0, 0, 0);
const blkProbe: RuleJson = {
  effect: 'blackout',
  duration: { hours: 12 },
  options: {
    freq: 'yearly',
    bymonth: [1],
    bymonthday: [1],
    byhour: [0],
    byminute: [0],
    bysecond: [0],
    starts: probeStarts,
    ends: probeEnds,
  },
};
const actProbe: RuleJson = {
  effect: 'active',
  duration: { hours: 6 },
  options: {
    freq: 'yearly',
    bymonth: [1],
    bymonthday: [1],
    byhour: [0],
    byminute: [0],
    bysecond: [0],
    starts: probeStarts,
    ends: probeEnds,
  },
};
const reverseSweep = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'blackout',
  rules: [blkProbe, actProbe],
});

// Overlay scenario: active 05:00–06:00 with blackout 05:30–05:45
const overlayActive: RuleJson = {
  effect: 'active',
  duration: { hours: 1 },
  options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
};
const overlayBlackout: RuleJson = {
  effect: 'blackout',
  duration: { minutes: 15 },
  options: { freq: 'daily', byhour: [5], byminute: [30], bysecond: [0] },
};
const overlay = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'blackout',
  rules: [overlayActive, overlayBlackout],
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

  bench('getEffectiveBounds — daily count-limited (finite series)', () => {
    dailyCountLimited.getEffectiveBounds();
  });

  bench(
    'getEffectiveBounds — reverse-sweep stress (ambiguous pre-pass)',
    () => {
      reverseSweep.getEffectiveBounds();
    },
  );

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

  bench(
    'getSegments — overlay (active + blackout slice) over 1-day window',
    () => {
      let acc = 0;
      for (const seg of overlay.getSegments(from, to)) {
        acc += seg.end - seg.start;
      }
      if (acc < 0) throw new Error('impossible');
    },
  );

  bench('classifyRange — overlay window', () => {
    overlay.classifyRange(day + 5 * 3600 * 1000, day + 6 * 3600 * 1000);
  });
});
