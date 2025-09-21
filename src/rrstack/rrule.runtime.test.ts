import { describe, expect, it } from 'vitest';

import { __pickRRuleNamespace } from './rrule.runtime';

describe('rrule.runtime shim', () => {
  it('uses default export when it contains rrule surface', () => {
    const fake: {
      default: {
        RRule: () => void;
        Weekday: () => void;
        Frequency: { YEARLY: number };
        datetime: () => Date;
      };
    } = {
      default: {
        RRule: function R() {},
        Weekday: function W() {},
        Frequency: { YEARLY: 0 },
        datetime: () => new Date(),
      },
    };
    const ns = __pickRRuleNamespace(fake);
    expect(typeof ns.RRule).toBe('function');
    expect(typeof ns.Weekday).toBe('function');
    expect(typeof ns.Frequency).toBe('object');
    expect(typeof ns.datetime).toBe('function');
  });

  it('falls back to namespace when default is absent', () => {
    const fake = {
      RRule: function R() {},
      Weekday: function W() {},
      Frequency: { YEARLY: 0 },
      datetime: () => new Date(),
    };
    const ns = __pickRRuleNamespace(fake);
    expect(typeof ns.RRule).toBe('function');
    expect(typeof ns.Frequency.YEARLY).toBe('number');
  });
});
