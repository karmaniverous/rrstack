import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { RRStack } from './';
import type { RuleJson, TimeZoneId } from './types';

const msLocal = (isoLocal: string, tz: string) =>
  DateTime.fromISO(isoLocal, { zone: tz }).toMillis();

describe('cross-timezone getEffectiveBounds + descriptions', () => {
  it('Europe/London: daily 09:00 open-end; earliest and description bounds', () => {
    const tz = 'Europe/London' as TimeZoneId;
    // Start clamp at local midnight; no end clamp (open end)
    const starts = msLocal('2024-05-01T00:00:00', 'Europe/London');
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [9],
        byminute: [0],
        bysecond: [0],
        starts,
      },
    };
    const s = new RRStack({ timezone: tz, rules: [rule] });
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    // Assert local wall-clock start time in the rule’s timezone (host-agnostic)
    const sL = DateTime.fromMillis(b.start!, { zone: 'Europe/London' });
    expect(sL.toFormat('yyyy-LL-dd HH:mm')).toBe('2024-05-01 09:00');
    expect(b.end).toBeUndefined(); // open end

    const text = s.describeRule(0, {
      bounds: { show: true, format: 'yyyy-LL-dd HH:mm' },
    });
    const lower = text.toLowerCase();
    expect(lower).toContain('every day');
    expect(lower).toContain('9:00');
    // With open end only "from" should appear
    expect(text).toContain('from 2024-05-01 00:00');
    expect(text).not.toContain('until 2024-');
  });

  it('Asia/Tokyo: monthly on the 15th at 09:00 (closed window); earliest/latest and bounds text', () => {
    const tz = 'Asia/Tokyo' as TimeZoneId;
    const starts = msLocal('2024-04-01T00:00:00', 'Asia/Tokyo');
    const ends = msLocal('2024-06-01T00:00:00', 'Asia/Tokyo');

    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'monthly',
        bymonthday: [15],
        byhour: [9],
        byminute: [0],
        bysecond: [0],
        starts,
        ends,
      },
    };
    const s = new RRStack({ timezone: tz, rules: [rule] });
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    const sL = DateTime.fromMillis(b.start!, { zone: 'Asia/Tokyo' });
    const eL = DateTime.fromMillis(b.end!, { zone: 'Asia/Tokyo' });
    expect(sL.toFormat('yyyy-LL-dd HH:mm')).toBe('2024-04-15 09:00');
    // Window includes 2024-05-15 09:00 + 1h = 10:00
    expect(eL.toFormat('yyyy-LL-dd HH:mm')).toBe('2024-05-15 10:00');

    const text = s.describeRule(0, {
      bounds: { show: true, format: 'yyyy-LL-dd' },
    });
    const lower = text.toLowerCase();
    // Monthly bymonthday phrasing and time-of-day
    expect(lower).toContain('every month');
    expect(lower).toContain('on the 15');
    expect(lower).toContain('9:00');
    // Bounds present (closed window)
    expect(text).toContain('from 2024-04-01');
    expect(text).toContain('until 2024-06-01');
  });

  it('Australia/Sydney: yearly count-limited (2 occurrences) yields finite latest bound', () => {
    const tz = 'Australia/Sydney' as TimeZoneId;
    const starts = msLocal('2021-01-01T00:00:00', 'Australia/Sydney');
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'yearly',
        bymonth: [7],
        bymonthday: [1],
        byhour: [8],
        byminute: [0],
        bysecond: [0],
        starts,
        count: 2, // finite series: 2021-07-01 and 2022-07-01
      },
    };
    const s = new RRStack({ timezone: tz, rules: [rule] });
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    const sL = DateTime.fromMillis(b.start!, { zone: 'Australia/Sydney' });
    const eL = DateTime.fromMillis(b.end!, { zone: 'Australia/Sydney' });
    expect(sL.toFormat('yyyy-LL-dd HH:mm')).toBe('2021-07-01 08:00');
    expect(eL.toFormat('yyyy-LL-dd HH:mm')).toBe('2022-07-01 09:00');
  });

  it('Asia/Kolkata: daily 18:30 (30m) with blackout overlay; latest end preserved; blackout description', () => {
    const tz = 'Asia/Kolkata' as TimeZoneId; // UTC+05:30 (no DST)
    const starts = msLocal('2024-03-01T00:00:00', 'Asia/Kolkata');
    const ends = msLocal('2024-03-04T00:00:00', 'Asia/Kolkata'); // window through Mar 3

    const active: RuleJson = {
      effect: 'active',
      duration: { minutes: 30 },
      options: {
        freq: 'daily',
        byhour: [18],
        byminute: [30],
        bysecond: [0],
        starts,
        ends,
      },
    };
    // Blackout exactly on 2024-03-02 at 18:30 (same cadence in the window)
    const blackout: RuleJson = {
      effect: 'blackout',
      duration: { minutes: 30 },
      options: {
        freq: 'yearly',
        bymonth: [3],
        bymonthday: [2],
        byhour: [18],
        byminute: [30],
        bysecond: [0],
        starts,
        ends,
      },
    };

    const s = new RRStack({ timezone: tz, rules: [active, blackout] });
    const b = s.getEffectiveBounds();
    expect(b.empty).toBe(false);
    const sL = DateTime.fromMillis(b.start!, { zone: 'Asia/Kolkata' });
    const eL = DateTime.fromMillis(b.end!, { zone: 'Asia/Kolkata' });
    expect(sL.toFormat('yyyy-LL-dd HH:mm')).toBe('2024-03-01 18:30');
    // last day in window (Mar 3), 18:30 + 30m ⇒ 19:00
    expect(eL.toFormat('yyyy-LL-dd HH:mm')).toBe('2024-03-03 19:00');

    // Description for the blackout rule should be clear, include duration and timezone
    const text = s.describeRule(1, { tz: { show: true } });
    const lower = text.toLowerCase();
    expect(lower).toContain('blackout');
    expect(lower).toContain('30 minute'); // "30 minutes" phrasing
    expect(lower).toContain('timezone asia/kolkata');
  });
});
