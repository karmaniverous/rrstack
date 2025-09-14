import { describe, expect, it } from 'vitest';

import { RRStack } from './RRStack';

describe('tests from the field', () => {
  it('handles asia/bangkok timezone', () => {
    const bangkokStack = new RRStack({
      timezone: 'Asia/Bangkok', // Only difference
      rules: [
        {
          effect: 'active',
          duration: { days: 1 },
          options: {
            freq: 'monthly',
            interval: 1,
            byhour: [9],
            byminute: [0],
            bysecond: [0],
            bysetpos: [1],
            byweekday: [4],
          },
        },
      ],
    });

    expect(bangkokStack).toBeDefined();
  });
});
