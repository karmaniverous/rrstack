import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import { getEffectiveBounds } from './bounds';
import { compileRule } from './compile';
import { computeOccurrenceEnd } from './coverage';
import { ruleCoversInstant } from './coverage';
import type { TimeZoneId } from './types';

const sec = (isoUtc: string) =>
  Math.trunc(DateTime.fromISO(isoUtc, { zone: 'UTC' }).toSeconds());
const secLocal = (isoLocal: string, tz: string) =>
  Math.trunc(DateTime.fromISO(isoLocal, { zone: tz }).toSeconds());

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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
      'ms',
    );

    const b = getEffectiveBounds([blk, act]);
    expect(b.empty).toBe(false);
    // Latest end is taken strictly before the probe window ⇒ 2098-01-01 06:00.
    expect(b.end).toBe(Date.UTC(2098, 0, 1, 6, 0, 0));
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
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
      'UTC' as TimeZoneId,
      'ms',
    );

    const b = getEffectiveBounds([act, blk]);
    expect(b.empty).toBe(false);
    // Open start detected (coverage begins at domainMin with open start).
    expect(b.start).toBeUndefined();
    // RRULE 'until' is inclusive; the 1970-01-02 00:00 start is included.
    expect(b.end).toBe(Date.UTC(1970, 0, 2, 0, 30, 0));
  });

  it("'s' timeUnit DST spring forward (America/Chicago): 01:30 + 1h => 03:30 local", () => {
    const tz = 'America/Chicago' as TimeZoneId;
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
    // Assert 1-hour span and local calendar day; avoid brittle absolute instants.
    expect(b.end! - b.start!).toBe(3600);
    const sL = DateTime.fromSeconds(b.start!, {
      zone: 'America/Chicago',
    });
    const eL = DateTime.fromSeconds(b.end!, {
      zone: 'America/Chicago',
    });
    expect(sL.toISODate()).toBe('2021-03-14');
    expect(eL.toISODate()).toBe('2021-03-14');
  });

  it("'s' timeUnit DST fall back (America/Chicago): 01:30 + 1h => 01:30 local", () => {
    const tz = 'America/Chicago' as TimeZoneId;
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
    // Extra debug: surface dtstart/until and last start/end expectations.
    if (rule.kind !== 'recur') throw new Error('expected recurring rule');
    const optDtstart =
      (rule.options as { dtstart?: Date | null }).dtstart ?? null;
    const optUntil = (rule.options as { until?: Date | null }).until ?? null;
    const toLocalIso = (d: Date | null) =>
      d
        ? DateTime.fromObject(
            {
              year: d.getUTCFullYear(),
              month: d.getUTCMonth() + 1,
              day: d.getUTCDate(),
              hour: d.getUTCHours(),
              minute: d.getUTCMinutes(),
              second: d.getUTCSeconds(),
              millisecond: d.getUTCMilliseconds(),
            },
            { zone: 'America/Chicago' },
          ).toISO()
        : null;
    const dtstartLocalISO = toLocalIso(optDtstart);
    const untilLocalISO = toLocalIso(optUntil);
    // rrule view of last start at/ before UNTIL (inclusive)
    let lastStartLocalISO: string | null = null;
    let expectedEndSec: number | null = null;
    if (optUntil instanceof Date) {
      const lastStart = rule.rrule.before(optUntil, true);
      if (lastStart instanceof Date) {
        const lastLocal = DateTime.fromObject(
          {
            year: lastStart.getUTCFullYear(),
            month: lastStart.getUTCMonth() + 1,
            day: lastStart.getUTCDate(),
            hour: lastStart.getUTCHours(),
            minute: lastStart.getUTCMinutes(),
            second: lastStart.getUTCSeconds(),
            millisecond: lastStart.getUTCMilliseconds(),
          },
          { zone: 'America/Chicago' },
        );
        lastStartLocalISO = lastLocal.toISO();
        // Derive expected end (seconds) in rule tz via helper
        const startSec = Math.trunc(lastLocal.toSeconds());
        expectedEndSec = computeOccurrenceEnd(rule, startSec);
      }
    }
    // Enumerate the local calendar day for extra context
    const dayStart = DateTime.fromSeconds(starts, {
      zone: 'America/Chicago',
    }).startOf('day');
    const nextDay = dayStart.plus({ days: 1 });
    const between = rule.rrule.between(
      new Date(
        Date.UTC(dayStart.year, dayStart.month - 1, dayStart.day, 0, 0, 0),
      ),
      new Date(Date.UTC(nextDay.year, nextDay.month - 1, nextDay.day, 0, 0, 0)),
      true,
    );
    const betweenLocal = between.map((d) =>
      DateTime.fromObject(
        {
          year: d.getUTCFullYear(),
          month: d.getUTCMonth() + 1,
          day: d.getUTCDate(),
          hour: d.getUTCHours(),
          minute: d.getUTCMinutes(),
          second: d.getUTCSeconds(),
          millisecond: d.getUTCMilliseconds(),
        },
        { zone: 'America/Chicago' },
      ).toISO(),
    );
    const b = getEffectiveBounds([rule]);
    expect(b.empty).toBe(false);
    // Coverage checks around the expected end (if we derived one)
    if (expectedEndSec !== null) {
      const expStartLocal = lastStartLocalISO;
      const expEndLocal = DateTime.fromSeconds(expectedEndSec, {
        zone: 'America/Chicago',
      }).toISO();
      const coversAtStart =
        lastStartLocalISO !== null
          ? ruleCoversInstant(
              rule,
              Math.trunc(
                DateTime.fromISO(lastStartLocalISO, {
                  zone: 'America/Chicago',
                }).toSeconds(),
              ),
            )
          : null;
      const coversAtEndMinus1 = ruleCoversInstant(rule, expectedEndSec - 1);
      const coversAtEnd = ruleCoversInstant(rule, expectedEndSec);
      console.log(
        '[DST fallback debug] expected last start=%s last end=%s covers(start)=%s covers(end-1)=%s covers(end)=%s',
        expStartLocal,
        expEndLocal,
        String(coversAtStart),
        String(coversAtEndMinus1),
        String(coversAtEnd),
      );
    }
    // Debug logging to diagnose occasional NaN span during DST fall back on 's' unit.
    if (b.start === undefined || b.end === undefined) {
      const sLocal = DateTime.fromSeconds(starts, {
        zone: 'America/Chicago',
      }).toISO();
      const eLocal = DateTime.fromSeconds(ends, {
        zone: 'America/Chicago',
      }).toISO();
      console.log(
        '[DST fallback debug] dtstartLocal=%s untilLocal=%s',
        dtstartLocalISO,
        untilLocalISO,
      );
      console.log(
        '[DST fallback debug] lastStartLocal=%s expectedEndSec=%s',
        lastStartLocalISO,
        String(expectedEndSec),
      );
      console.log('[DST fallback debug] between local day = %o', betweenLocal);

      console.log(
        '[DST fallback debug] tz=%s starts(s)=%s ends(s)=%s startsLocal=%s endsLocal=%s bounds=%o',
        'America/Chicago',
        String(starts),
        String(ends),
        sLocal,
        eLocal,
        b,
      );
    } else {
      const sLdbg = DateTime.fromSeconds(b.start, {
        zone: 'America/Chicago',
      }).toISO();
      const eLdbg = DateTime.fromSeconds(b.end, {
        zone: 'America/Chicago',
      }).toISO();
      const span = b.end - b.start;
      // Also log wall-clock of b.start for comparison with expected last start
      console.log(
        '[DST fallback debug] b.start local=%s b.end local=%s',
        sLdbg,
        eLdbg,
      );

      console.log(
        '[DST fallback debug] dtstartLocal=%s untilLocal=%s',
        dtstartLocalISO,
        untilLocalISO,
      );
      console.log(
        '[DST fallback debug] lastStartLocal=%s expectedEndSec=%s',
        lastStartLocalISO,
        String(expectedEndSec),
      );
      console.log('[DST fallback debug] between local day = %o', betweenLocal);
      console.log(
        '[DST fallback debug] bounds.start=%d (%s) bounds.end=%d (%s) span=%d',
        b.start,
        sLdbg,
        b.end,
        eLdbg,
        span,
      );
    }
    // Assert 1-hour span and local calendar day; avoid brittle absolute instants.
    expect(b.end! - b.start!).toBe(3600);
    const sL = DateTime.fromSeconds(b.start!, {
      zone: 'America/Chicago',
    });
    const eL = DateTime.fromSeconds(b.end!, {
      zone: 'America/Chicago',
    });
    expect(sL.toISODate()).toBe('2021-11-07');
    expect(eL.toISODate()).toBe('2021-11-07');
  });

  it('America/Chicago daily (duration 1 day) with starts clamp: earliest equals starts', () => {
    // starts = 1759294800000 ms = 2025-10-01T05:00:00Z, which is 00:00 local
    // in America/Chicago (DST active). Rule is open-end (no ends clamp).
    const starts = 1_759_294_800_000;
    const stack = new RRStack({
      timezone: 'America/Chicago',
      rules: [
        {
          effect: 'active' as const,
          duration: { days: 1 },
          options: { freq: 'daily' as const, starts },
        },
      ],
    });
    const b = stack.getEffectiveBounds();
    expect(b.empty).toBe(false);
    expect(b.start).toBe(starts);
    expect(b.end).toBeUndefined(); // open end
  });
});
