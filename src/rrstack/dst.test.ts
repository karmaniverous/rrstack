import { DateTime } from 'luxon';
import { Frequency } from 'rrule';
import { describe, expect, it } from 'vitest';

import { compileRule } from './compile';
import { computeOccurrenceEndMs } from './coverage';
import type { RuleJson } from './types';

describe('DST handling (America/Chicago)', () => {
  const tz = 'America/Chicago';
  const ms = (isoLocal: string) => DateTime.fromISO(isoLocal, { zone: tz }).toMillis();

  it('spring forward: 2021-03-14 01:30 + 1h => 03:30 local', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: 'PT1H',
      options: {
        freq: Frequency.DAILY,
        byhour: [1],
        byminute: [30],
        bysecond: [0],
      },
    };
    const cr = compileRule(rule, tz);

    const start = ms('2021-03-14T01:30:00');
    const end = computeOccurrenceEndMs(cr, start);
    const endLocal = DateTime.fromMillis(end, { zone: tz });

    expect(endLocal.hour).toBe(3);
    expect(endLocal.minute).toBe(30);
    expect(end - start).toBe(60 * 60 * 1000);
  });

  it('fall back: 2021-11-07 01:30 + 1h => 01:30 local (repeated hour)', () => {
    const rule: RuleJson = {
      effect: 'active',
      duration: 'PT1H',
      options: {
        freq: Frequency.DAILY,
        byhour: [1],
        byminute: [30],
        bysecond: [0],
      },
    };
    const cr = compileRule(rule, tz);

    const start = ms('2021-11-07T01:30:00');
    const end = computeOccurrenceEndMs(cr, start);
    const endLocal = DateTime.fromMillis(end, { zone: tz });

    expect(endLocal.hour).toBe(1);
    expect(endLocal.minute).toBe(30);
    expect(end - start).toBe(60 * 60 * 1000);
  });
});
