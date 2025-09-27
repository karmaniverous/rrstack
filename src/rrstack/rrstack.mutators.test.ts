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
  it('addRule with no args appends a default active open span', () => {
    const s = new RRStack({ timezone: 'UTC', rules: [] });
    s.addRule(); // no arguments
    expect(s.rules.length).toBe(1);
    const r = s.rules[0];
    expect(r.effect).toBe('active');
    // span defaults: duration omitted; empty options object
    expect(r.duration).toBeUndefined();
    expect(r.options).toEqual({});
  });

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

  it('removeRule deletes a rule at index and preserves remaining order', () => {
    const s = new RRStack({
      timezone: 'UTC',
      rules: [ruleAt(5, 'A'), ruleAt(6, 'B'), ruleAt(7, 'C')],
    });
    s.removeRule(1);
    expect(s.rules.map((r) => r.label)).toEqual(['A', 'C']);
  });

  describe('error cases', () => {
    it('removeRule throws on non-integer or out-of-range index', () => {
      const s = new RRStack({ timezone: 'UTC', rules: [ruleAt(5, 'A')] });
      expect(() => {
        s.removeRule(0.5 as unknown as number);
      }).toThrow(TypeError);
      expect(() => {
        s.removeRule(-1);
      }).toThrow(RangeError);
      expect(() => {
        s.removeRule(1);
      }).toThrow(RangeError);
    });

    it('swap throws on non-integer indices or out-of-range', () => {
      const s = new RRStack({
        timezone: 'UTC',
        rules: [ruleAt(5, 'A'), ruleAt(6, 'B')],
      });
      expect(() => {
        s.swap(0.5 as unknown as number, 1);
      }).toThrow(TypeError);
      expect(() => {
        s.swap(0, 1.2 as unknown as number);
      }).toThrow(TypeError);
      expect(() => {
        s.swap(-1, 0);
      }).toThrow(RangeError);
      expect(() => {
        s.swap(0, 2);
      }).toThrow(RangeError);
    });

    it('up throws on non-integer or out-of-range index', () => {
      const s = new RRStack({
        timezone: 'UTC',
        rules: [ruleAt(5, 'A'), ruleAt(6, 'B')],
      });
      expect(() => {
        s.up(0.1 as unknown as number);
      }).toThrow(TypeError);
      expect(() => {
        s.up(-1);
      }).toThrow(RangeError);
      expect(() => {
        s.up(2);
      }).toThrow(RangeError);
    });

    it('down throws on non-integer or out-of-range index', () => {
      const s = new RRStack({
        timezone: 'UTC',
        rules: [ruleAt(5, 'A'), ruleAt(6, 'B')],
      });
      expect(() => {
        s.down(1.1 as unknown as number);
      }).toThrow(TypeError);
      expect(() => {
        s.down(-1);
      }).toThrow(RangeError);
      expect(() => {
        s.down(2);
      }).toThrow(RangeError);
    });

    it('top throws on non-integer or out-of-range index', () => {
      const s = new RRStack({
        timezone: 'UTC',
        rules: [ruleAt(5, 'A'), ruleAt(6, 'B')],
      });
      expect(() => {
        s.top(1.5 as unknown as number);
      }).toThrow(TypeError);
      expect(() => {
        s.top(-1);
      }).toThrow(RangeError);
      expect(() => {
        s.top(2);
      }).toThrow(RangeError);
    });

    it('bottom throws on non-integer or out-of-range index', () => {
      const s = new RRStack({
        timezone: 'UTC',
        rules: [ruleAt(5, 'A'), ruleAt(6, 'B')],
      });
      expect(() => {
        s.bottom(2.2 as unknown as number);
      }).toThrow(TypeError);
      expect(() => {
        s.bottom(-1);
      }).toThrow(RangeError);
      expect(() => {
        s.bottom(2);
      }).toThrow(RangeError);
    });
  });
});
