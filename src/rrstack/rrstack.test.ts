import { describe, expect, it } from 'vitest';
import { Frequency } from 'rrule';
import { RRStack } from './';

describe('RRStack', () => {
  it('constructs from JSON and evaluates isActiveAt', () => {
    const json = {
      version: 1 as const,
      timezone: 'UTC',
      rules: [
        {
          effect: 'active' as const,
          duration: 'PT1H',
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

    const stack = RRStack.fromJson(json);
    const day = Date.UTC(2024, 0, 2);
    const five = day + 5 * 3600 * 1000;
    const four = day + 4 * 3600 * 1000;
    expect(stack.isActiveAt(five)).toBe('active');
    expect(stack.isActiveAt(four)).toBe('blackout');

    const roundTrip = stack.toJson();
    expect(roundTrip).toEqual(json);
  });

  it('supports rule reordering without throwing', () => {
    const stack = new RRStack({ timezone: 'UTC', rules: [] });
    stack.addRule({
      effect: 'active',
      duration: 'PT30M',
      options: { freq: Frequency.DAILY, byhour: [12], byminute: [0], bysecond: [0] },
      label: 'A',
    });
    stack.addRule({
      effect: 'blackout',
      duration: 'PT10M',
      options: { freq: Frequency.DAILY, byhour: [12], byminute: [5], bysecond: [0] },
      label: 'B',
    });
    stack.ruleUp(1);
    stack.ruleDown(0);
    stack.ruleToTop(1);
    stack.ruleToBottom(0);
    // No throws; simple smoke
    expect(true).toBe(true);
  });
});
