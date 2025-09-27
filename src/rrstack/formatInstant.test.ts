import { describe, expect, it } from 'vitest';

import { RRStack } from './';

describe('RRStack.formatInstant', () => {
  it("formats ISO with 'ms' unit in UTC", () => {
    const s = new RRStack({ timezone: 'UTC' });
    const ms = Date.UTC(2024, 0, 2, 5, 30, 0); // 2024-01-02T05:30:00Z
    const out = s.formatInstant(ms);
    expect(out).toBe('2024-01-02T05:30:00Z');
  });

  it("formats ISO with 's' unit in UTC", () => {
    const s = new RRStack({ timezone: 'UTC', timeUnit: 's' });
    const ms = Date.UTC(2024, 0, 2, 5, 30, 0);
    const sec = Math.trunc(ms / 1000);
    const out = s.formatInstant(sec);
    expect(out).toBe('2024-01-02T05:30:00Z');
  });

  it('supports Luxon format strings', () => {
    const s = new RRStack({ timezone: 'UTC' });
    const ms = Date.UTC(2024, 0, 2, 5, 30, 0);
    const out = s.formatInstant(ms, { format: 'yyyy-LL-dd HH:mm' });
    expect(out).toBe('2024-01-02 05:30');
  });
});
