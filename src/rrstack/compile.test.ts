import { describe, expect, it } from 'vitest';

import { compileRule } from './compile';
import type { TimeZoneId } from './types';

describe('compileRule', () => {
  it('compiles a simple daily rule with duration', () => {
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
    if (cr.kind !== 'recur') throw new Error('expected recurring rule');
    expect(cr.duration.isValid).toBe(true);
    const starts = cr.rrule.between(
      new Date(Date.UTC(2024, 0, 1)),
      new Date(Date.UTC(2024, 0, 3)),
      true,
    );
    expect(starts.length).toBeGreaterThan(0);
  });
});
