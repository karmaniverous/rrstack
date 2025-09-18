import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { getEffectiveBounds } from './bounds';
import { compileRule } from './compile';
import type { TimeZoneId } from './types';

const sec = (isoUtc: string) =>
  Math.trunc(DateTime.fromISO(isoUtc, { zone: 'UTC' }).toSeconds());

describe('bounds: additional scenarios', () => {
  it('blackout-only rules yield empty=true (no active coverage)', () => {
    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
    const ends = Date.UTC(2024, 0, 12, 0, 0, 0);

    const blackout = compileRule(
      {
        effect: 'blackout',
        duration: { hours: 1 },
        options: {
          freq: 'daily',
          byhour: [5],
          byminute: [0],
          bysecond: [0],
          starts,
          ends,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );

    const b = getEffectiveBounds([blackout]);
    expect(b.empty).toBe(true);
    expect(b.start).toBeUndefined();
    expect(b.end).toBeUndefined();
  });

  it("'s' timeUnit: closed day with seconds duration (integer boundaries)", () => {
    const starts = sec('2024-01-10T00:00:00Z'); // seconds clamp
    const ends = sec('2024-01-11T00:00:00Z'); // seconds clamp

    const active = compileRule(
      {
        effect: 'active',
        duration: { seconds: 90 }, // 1m30s
        options: {
          freq: 'daily',
          byhour: [5],
          byminute: [0],
          bysecond: [0],
          starts,
          ends,
        },
      },
      'UTC' as unknown as TimeZoneId,
      's',
    );

    const b = getEffectiveBounds([active]);
    expect(b.empty).toBe(false);
    expect(b.start).toBe(sec('2024-01-10T05:00:00Z'));
    expect(b.end).toBe(sec('2024-01-10T05:01:30Z'));
  });

  it('multiple active rules: earliest across actives; latest is the latest active end', () => {
    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
    const ends = Date.UTC(2024, 0, 12, 0, 0, 0);

    // Long activation: 05:00–06:00 (daily, Jan 10–11)
    const activeLong = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: {
          freq: 'daily',
          byhour: [5],
          byminute: [0],
          bysecond: [0],
          starts,
          ends,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );

    // Earlier short activation: 03:00–03:10
    const activeEarly = compileRule(
      {
        effect: 'active',
        duration: { minutes: 10 },
        options: {
          freq: 'daily',
          byhour: [3],
          byminute: [0],
          bysecond: [0],
          starts,
          ends,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );

    const b = getEffectiveBounds([activeLong, activeEarly]);
    expect(b.empty).toBe(false);
    // Earliest is 2024-01-10 03:00; latest is 2024-01-11 06:00
    expect(b.start).toBe(Date.UTC(2024, 0, 10, 3, 0, 0));
    expect(b.end).toBe(Date.UTC(2024, 0, 11, 6, 0, 0));
  });

  it('pre-pass ambiguous (earliest blackout before active) resolves to first active start', () => {
    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
    const ends = Date.UTC(2024, 0, 12, 0, 0, 0);

    const active = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: {
          freq: 'daily',
          byhour: [5],
          byminute: [0],
          bysecond: [0],
          starts,
          ends,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    const blackoutEarly = compileRule(
      {
        effect: 'blackout',
        duration: { minutes: 30 },
        options: {
          freq: 'daily',
          byhour: [4],
          byminute: [0],
          bysecond: [0],
          starts,
          ends,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );

    const b = getEffectiveBounds([active, blackoutEarly]);
    expect(b.empty).toBe(false);
    expect(b.start).toBe(Date.UTC(2024, 0, 10, 5, 0, 0));
    expect(b.end).toBe(Date.UTC(2024, 0, 11, 6, 0, 0));
  });
});
