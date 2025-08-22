import { Frequency } from 'rrule';
import { describe, expect, it } from 'vitest';

import { compileRule } from './compile';

describe('compileRule', () => {
  it('compiles a simple daily rule with duration', () => {
    const cr = compileRule(
      {
        effect: 'active',
        duration: 'PT1H',
        options: {
          freq: Frequency.DAILY,
          byhour: [5],
          byminute: [0],
          bysecond: [0],
        },
      },
      'UTC',
    );
    expect(cr.duration.isValid).toBe(true);
    const starts = cr.rrule.between(new Date(Date.UTC(2024, 0, 1)), new Date(Date.UTC(2024, 0, 3)), true);
    expect(starts.length).toBeGreaterThan(0);
  });
});
