import { describe, expect, it } from 'vitest';

import { compileRule } from './compile';
import { computeOccurrenceEnd, ruleCoversInstant } from './coverage';
import type { TimeZoneId } from './types';

describe('coverage', () => {
  it('detects coverage within a 1-hour window at 05:00 UTC', () => {
    const cr = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: {
          freq: 'daily',
          byhour: [5],
          byminute: [0],
          bysecond: [0],
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    const day = Date.UTC(2024, 0, 2);
    const five = new Date(day + 5 * 3600 * 1000).getTime();
    const fiveThirty = five + 30 * 60 * 1000;
    const six = five + 60 * 60 * 1000;

    expect(ruleCoversInstant(cr, five)).toBe(true);
    expect(ruleCoversInstant(cr, fiveThirty)).toBe(true);
    expect(ruleCoversInstant(cr, six - 1)).toBe(true);
    expect(ruleCoversInstant(cr, six)).toBe(false);

    if (cr.kind !== 'recur') throw new Error('expected recurring rule');
    const end = computeOccurrenceEnd(cr, five);
    expect(end).toBe(six);
  });
});
