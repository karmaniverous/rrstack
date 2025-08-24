import { describe, expect, it } from 'vitest';

import { RRStack } from './';

describe('types / options', () => {
  it('defaults to ms timeUnit and empty rules; now() returns a number', () => {
    const s = new RRStack({ timezone: 'UTC' });
    expect(s.timeUnit).toBe('ms');
    expect(Array.isArray(s.rules)).toBe(true);
    const n = s.now();
    expect(typeof n).toBe('number');
    expect(n > 0).toBe(true);
  });

  it('seconds mode returns integer seconds', () => {
    const s = new RRStack({ timezone: 'UTC', timeUnit: 's' });
    const n = s.now();
    expect(Number.isInteger(n)).toBe(true);
  });
});
