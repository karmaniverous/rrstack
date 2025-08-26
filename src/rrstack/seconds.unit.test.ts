import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { compileRule } from './compile';
import { computeOccurrenceEnd } from './coverage';
import type { RuleJson, TimeZoneId } from './types';
const sec = (isoLocal: string, tz: string) =>
  Math.trunc(DateTime.fromISO(isoLocal, { zone: tz }).toSeconds());

describe("'s' timeUnit: DST handling and rounded ends", () => {
  const tz = 'America/Chicago';
  const tzId = tz as unknown as TimeZoneId;

  it('spring forward: 2021-03-14 01:30 + 1h => 03:30 local; 3600 seconds', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [1],
        byminute: [30],
        bysecond: [0],
      },    };
    const cr = compileRule(rule, tzId, 's');

    const start = sec('2021-03-14T01:30:00', tz);
    const end = computeOccurrenceEnd(cr, start);
    const endLocal = DateTime.fromSeconds(end, { zone: tz });

    expect(endLocal.hour).toBe(3);
    expect(endLocal.minute).toBe(30);
    expect(end - start).toBe(60 * 60);
  });

  it('fall back: 2021-11-07 01:30 + 1h => 01:30 local; 3600 seconds', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [1],
        byminute: [30],
        bysecond: [0],
      },    };
    const cr = compileRule(rule, tzId, 's');

    const start = sec('2021-11-07T01:30:00', tz);
    const end = computeOccurrenceEnd(cr, start);
    const endLocal = DateTime.fromSeconds(end, { zone: tz });

    expect(endLocal.hour).toBe(1);
    expect(endLocal.minute).toBe(30);
    expect(end - start).toBe(60 * 60);
  });
});
