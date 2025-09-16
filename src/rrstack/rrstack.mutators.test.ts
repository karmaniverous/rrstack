import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson } from './types';

const ruleAt = (h: number, label: string): RuleJson => ({
  effect: 'active',
  duration: { minutes: 30 },
  options: { freq: 'daily', byhour: [h], byminute: [0], bysecond: [0] },
  label,
});

describe('RRStack convenience mutators', () => {
  it('addRule inserts at index or appends when index omitted', () => {
    const s = new RRStack({ timezone: 'UTC', rules: [] });
    s.addRule(ruleAt(5, 'A'));
    expect(s.rules.length).toBe(1);
    expect(s.rules[0]?.label).toBe('A');

    s.addRule(ruleAt(6, 'B'), 0);
    expect(s.rules.length).toBe(2);
    expect(s.rules[0]?.label).toBe('B');
    expect(s.rules[1]?.label).toBe('A');
  });

  it('swap exchanges rules by index', () => {
    const s = new RRStack({
      timezone: 'UTC',
      rules: [ruleAt(5, 'A'), ruleAt(6, 'B'), ruleAt(7, 'C')],
    });
    s.swap(0, 2);
    expect(s.rules.map((r) => r.label)).toEqual(['C', 'B', 'A']);
  });

  it('up/down move rules one position', () => {
    const s = new RRStack({
      timezone: 'UTC',
      rules: [ruleAt(5, 'A'), ruleAt(6, 'B'), ruleAt(7, 'C')],
    });
    s.up(2);
    expect(s.rules.map((r) => r.label)).toEqual(['A', 'C', 'B']);
    s.down(0);
    expect(s.rules.map((r) => r.label)).toEqual(['C', 'A', 'B']);
  });

  it('top/bottom move rules to extremes', () => {
    const s = new RRStack({
      timezone: 'UTC',
      rules: [ruleAt(5, 'A'), ruleAt(6, 'B'), ruleAt(7, 'C')],
    });
    s.top(2);
    expect(s.rules.map((r) => r.label)).toEqual(['C', 'A', 'B']);
    s.bottom(0);
    expect(s.rules.map((r) => r.label)).toEqual(['A', 'B', 'C']);
  });
});
