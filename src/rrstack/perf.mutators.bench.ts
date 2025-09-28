import { bench, describe } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

// Simple rule factory
const ruleAt = (h: number, label?: string): RuleJson => ({
  effect: 'active',
  duration: { minutes: 15 },
  options: { freq: 'daily', byhour: [h], byminute: [0], bysecond: [0] },
  label,
});

// Single instance; reset rules per-iteration inside each bench for fixed pre-state
const stack = new RRStack({
  timezone: 'UTC',
  defaultEffect: 'blackout',
  rules: [],
});

let seq = 0;
const nextH = () => (seq = (seq + 1) % 24);

describe('RRStack mutator benchmarks (Node-only)', () => {
  // Add: 0 -> 1
  bench('add first rule (0 → 1)', () => {
    stack.rules = [];
    stack.addRule(ruleAt(nextH(), 'first'));
  });

  // Add: 1 -> 2
  bench('add second rule (1 → 2)', () => {
    stack.rules = [ruleAt(nextH(), 'seed')];
    stack.addRule(ruleAt(nextH(), 'second'));
  });

  // Remove: 1 -> 0
  bench('remove last (1 → 0)', () => {
    stack.rules = [ruleAt(nextH(), 'only')];
    stack.removeRule(0);
  });

  // Swap two ends (size 3 pre-state)
  bench('swap(0,last) (size 3)', () => {
    stack.rules = [
      ruleAt(nextH(), 'A'),
      ruleAt(nextH(), 'B'),
      ruleAt(nextH(), 'C'),
    ];
    stack.swap(0, stack.rules.length - 1);
  });

  // Up last (size 3)
  bench('up(last) (size 3)', () => {
    stack.rules = [
      ruleAt(nextH(), 'A'),
      ruleAt(nextH(), 'B'),
      ruleAt(nextH(), 'C'),
    ];
    stack.up(stack.rules.length - 1);
  });

  // Down first (size 3)
  bench('down(0) (size 3)', () => {
    stack.rules = [
      ruleAt(nextH(), 'A'),
      ruleAt(nextH(), 'B'),
      ruleAt(nextH(), 'C'),
    ];
    stack.down(0);
  });

  // Top last (size 3)
  bench('top(last) (size 3)', () => {
    stack.rules = [
      ruleAt(nextH(), 'A'),
      ruleAt(nextH(), 'B'),
      ruleAt(nextH(), 'C'),
    ];
    stack.top(stack.rules.length - 1);
  });

  // Bottom first (size 3)
  bench('bottom(0) (size 3)', () => {
    stack.rules = [
      ruleAt(nextH(), 'A'),
      ruleAt(nextH(), 'B'),
      ruleAt(nextH(), 'C'),
    ];
    stack.bottom(0);
  });
});
