import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { getEffectiveBounds } from './bounds';
import { compileRule } from './compile';
import type { TimeZoneId } from './types';

const sec = (isoUtc: string) =>
  Math.trunc(DateTime.fromISO(isoUtc, { zone: 'UTC' }).toSeconds());
const secLocal = (isoLocal: string, tz: string) =>
  Math.trunc(DateTime.fromISO(isoLocal, { zone: tz }).toSeconds());

describe('bounds: additional scenarios', () => {
  it('blackout-only rules yield empty=true (no active coverage)', () => {    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
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

  it('same-instant tie on first day (blackout overrides; next day active)', () => {
    // Active: daily 05:00–06:00 on Jan 10–12.
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
    // Blackout exactly on the first day at 05:00–06:00 (same instant tie).
    const blackoutFirstOnly = compileRule(
      {
        effect: 'blackout',
        duration: { hours: 1 },
        options: {
          freq: 'yearly',
          bymonth: [1],
          bymonthday: [10],
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

    const b = getEffectiveBounds([active, blackoutFirstOnly]);
    expect(b.empty).toBe(false);
    // Earliest active becomes Jan 11 at 05:00; latest end Jan 11 06:00.
    expect(b.start).toBe(Date.UTC(2024, 0, 11, 5, 0, 0));
    expect(b.end).toBe(Date.UTC(2024, 0, 11, 6, 0, 0));
  });

  it('backward fallback path (status at probe active; pre-pass ambiguous)', () => {
    // Force status at far-future probe to be active by placing an active rule
    // after a blackout (later rule overrides earlier blackout at the probe).
    // Also ensure latestActiveEndCandidate <= latestBlackoutEndCandidate so pre-pass
    // doesn't decide; this triggers the event-by-event reverse sweep.
    const probeStarts = Date.UTC(2090, 0, 1, 0, 0, 0);
    const probeEnds = Date.UTC(2100, 1, 1, 0, 0, 0);

    // Earlier rule: blackout 00:00–12:00 on Jan 1 yearly
    const blk = compileRule(
      {
        effect: 'blackout',
        duration: { hours: 12 },
        options: {
          freq: 'yearly',
          bymonth: [1],
          bymonthday: [1],
          byhour: [0],
          byminute: [0],
          bysecond: [0],
          starts: probeStarts,
          ends: probeEnds,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    // Later rule: active 00:00–06:00 on Jan 1 yearly (overrides blackout at probe)
    const act = compileRule(
      {
        effect: 'active',
        duration: { hours: 6 },
        options: {
          freq: 'yearly',
          bymonth: [1],
          bymonthday: [1],
          byhour: [0],
          byminute: [0],
          bysecond: [0],
          starts: probeStarts,
          ends: probeEnds,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );

    const b = getEffectiveBounds([blk, act]);
    expect(b.empty).toBe(false);
    // Latest active end for 2099-01-01 should be 06:00 (active shorter than blackout).
    expect(b.end).toBe(Date.UTC(2099, 0, 1, 6, 0, 0));
  });

  it('multiple blackouts around the last active end', () => {
    // Active Jan 10–13 daily 05:00–06:00; blackouts on 11 and 12 at 05:00.
    const starts = Date.UTC(2024, 0, 10, 0, 0, 0);
    const ends = Date.UTC(2024, 0, 13, 0, 0, 0);

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
    const blk1112 = compileRule(
      {
        effect: 'blackout',
        duration: { hours: 1 },
        options: {
          freq: 'yearly',
          bymonth: [1],
          bymonthday: [11, 12],
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

    const b = getEffectiveBounds([active, blk1112]);
    expect(b.empty).toBe(false);
    expect(b.start).toBe(Date.UTC(2024, 0, 10, 5, 0, 0));
    // Last two days blacked out => latest end is the first day's end.
    expect(b.end).toBe(Date.UTC(2024, 0, 10, 6, 0, 0));
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

  it('open-start active with an early blackout: start remains open; end finite', () => {
    // Open-start active at 00:00–00:30 daily; clamp end at 1970-01-02.
    // Early blackout on 1970-01-01 00:10–00:20.
    const ends = Date.UTC(1970, 0, 2, 0, 0, 0);

    const act = compileRule(
      {
        effect: 'active',
        duration: { minutes: 30 },
        options: {
          freq: 'daily',
          byhour: [0],
          byminute: [0],
          bysecond: [0],
          // starts omitted => open start
          ends,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );
    const blk = compileRule(
      {
        effect: 'blackout',
        duration: { minutes: 10 },
        options: {
          freq: 'yearly',
          bymonth: [1],
          bymonthday: [1],
          byhour: [0],
          byminute: [10],
          bysecond: [0],
          starts: Date.UTC(1970, 0, 1, 0, 0, 0),
          ends,
        },
      },
      'UTC' as unknown as TimeZoneId,
      'ms',
    );

    const b = getEffectiveBounds([act, blk]);
    expect(b.empty).toBe(false);
    // Open start detected (coverage begins at domainMin with open start).
    expect(b.start).toBeUndefined();
    // Latest end is 1970-01-01 00:30 (first day's end).
    expect(b.end).toBe(Date.UTC(1970, 0, 1, 0, 30, 0));
  });

  it("'s' timeUnit DST spring forward (America/Chicago): 01:30 + 1h => 03:30 local", () => {
    const tz = 'America/Chicago' as unknown as TimeZoneId;
    const starts = secLocal('2021-03-14T00:00:00', 'America/Chicago');
    const ends = secLocal('2021-03-15T00:00:00', 'America/Chicago');

    const rule = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: {
          freq: 'daily',
          byhour: [1],
          byminute: [30],
          bysecond: [0],
          starts,
          ends,
        },
      },
      tz,
      's',
    );
    const b = getEffectiveBounds([rule]);
    expect(b.empty).toBe(false);
    expect(b.start).toBe(secLocal('2021-03-14T01:30:00', 'America/Chicago'));
    expect(b.end).toBe(secLocal('2021-03-14T03:30:00', 'America/Chicago'));
  });

  it("'s' timeUnit DST fall back (America/Chicago): 01:30 + 1h => 01:30 local", () => {
    const tz = 'America/Chicago' as unknown as TimeZoneId;
    const starts = secLocal('2021-11-07T00:00:00', 'America/Chicago');
    const ends = secLocal('2021-11-08T00:00:00', 'America/Chicago');

    const rule = compileRule(
      {
        effect: 'active',
        duration: { hours: 1 },
        options: {
          freq: 'daily',
          byhour: [1],
          byminute: [30],
          bysecond: [0],
          starts,
          ends,
        },
      },
      tz,
      's',
    );
    const b = getEffectiveBounds([rule]);
    expect(b.empty).toBe(false);
    expect(b.start).toBe(secLocal('2021-11-07T01:30:00', 'America/Chicago'));
    expect(b.end).toBe(secLocal('2021-11-07T01:30:00', 'America/Chicago'));
  });
});