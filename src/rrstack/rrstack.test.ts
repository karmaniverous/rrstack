import { Frequency } from 'rrule';
import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RRStackJson } from './types';

describe('RRStack', () => {
  it('constructs from JSON and evaluates isActiveAt', () => {
    const json = {
      version: '0.0.0',
      timezone: 'UTC',
      timeUnit: 'ms' as const,
      rules: [
        {
          effect: 'active' as const,
          duration: { hours: 1 },
          options: {
            freq: Frequency.DAILY,
            byhour: [5],
            byminute: [0],
            bysecond: [0],
          },
          label: 'morning-hour',
        },
      ],
    };

    const stack = RRStack.fromJson(json as unknown as RRStackJson);
    const day = Date.UTC(2024, 0, 2);
    const five = day + 5 * 3600 * 1000;
    const four = day + 4 * 3600 * 1000;
    expect(stack.isActiveAt(five)).toBe('active');
    expect(stack.isActiveAt(four)).toBe('blackout');

    const roundTrip = stack.toJson();
    expect(roundTrip.timezone).toEqual('UTC');
    expect(roundTrip.rules.length).toBe(1);
    expect(roundTrip.rules[0].label).toBe('morning-hour');
  });

  it('supports rule reordering via setter without throwing', () => {
    const stack = new RRStack({ timezone: 'UTC', rules: [] });
    stack.rules = [
      {
        effect: 'active',
        duration: { minutes: 30 },
        options: { freq: Frequency.DAILY, byhour: [12], byminute: [0], bysecond: [0] },
        label: 'A',
      },
      {
        effect: 'blackout',
        duration: { minutes: 10 },
        options: { freq: Frequency.DAILY, byhour: [12], byminute: [5], bysecond: [0] },
        label: 'B',
      },
    ];
    // No throws; simple smoke
    expect(Array.isArray(stack.rules)).toBe(true);
  });
});
