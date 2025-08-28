/**
 * Requirements addressed:
 * - Determine if a compiled rule covers an instant (unit-aware).
 * - Rely on unit-aware helpers for DST correctness and conversions.
 * - Provide re-exports for computeOccurrenceEnd and enumerateStarts.
 */

import { DateTime } from 'luxon';

import type { CompiledRule } from './compile';
import { enumerationHorizon } from './coverage/enumerate';
import {
  localDayMatchesCommonPatterns,
  localDayMatchesDailyTimes,
} from './coverage/patterns';
import {
  computeOccurrenceEnd,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from './coverage/time';
import { datetime } from './rrule.runtime';

export { enumerateStarts } from './coverage/enumerate';
export { computeOccurrenceEnd } from './coverage/time';

/**
 * Test whether a compiled rule covers a timestamp `t`.
 *
 * Strategy (robust across environments):
 * 1) Enumerate starts on the local calendar day of `t`, checking both floating
 *    and zoned epoch candidates, plus structural matches for daily and common
 *    monthly/yearly patterns.
 * 2) Probe `rrule.before()` at wall-clock `t` and test [start, end).
 * 3) Fallback: enumerate within a frequency/interval-aware backward horizon.
 *
 * @param rule - Compiled rule (unit and tz aware).
 * @param t - Timestamp in the configured unit.
 * @returns True if `t` lies within a covered occurrence.
 */
export const ruleCoversInstant = (rule: CompiledRule, t: number): boolean => {
  // 0) Day-window enumeration: all starts occurring on local calendar day of t.
  {
    const local =
      rule.unit === 'ms'
        ? DateTime.fromMillis(t, { zone: rule.tz })
        : DateTime.fromSeconds(t, { zone: rule.tz });
    const dayStartWall = datetime(local.year, local.month, local.day, 0, 0, 0);
    const nextDay = local.plus({ days: 1 });
    const dayEndWallExclusive = datetime(
      nextDay.year,
      nextDay.month,
      nextDay.day,
      0,
      0,
      0,
    );

    const dayStarts = rule.rrule.between(
      dayStartWall,
      dayEndWallExclusive,
      true,
    );
    for (const sd of dayStarts) {
      const candidates = [
        sd.getTime(),
        floatingDateToZonedEpoch(sd, rule.tz, rule.unit),
      ];
      for (const start of candidates) {
        const end = computeOccurrenceEnd(rule, start);
        if (start <= t && t < end) return true;
      }
    }

    if (localDayMatchesDailyTimes(rule, t)) return true;
    if (localDayMatchesCommonPatterns(rule, t)) return true;
  }

  // 1) Robust coverage via rrule.before at wall-clock t.
  const wallT = epochToWallDate(t, rule.tz, rule.unit);
  const d = rule.rrule.before(wallT, true);
  if (d) {
    const startEpoch = d.getTime();
    const endEpoch = computeOccurrenceEnd(rule, startEpoch);
    if (startEpoch <= t && t < endEpoch) return true;

    const startFloat = floatingDateToZonedEpoch(d, rule.tz, rule.unit);
    const endFloat = computeOccurrenceEnd(rule, startFloat);
    if (startFloat <= t && t < endFloat) return true;
  }

  // 2) Fallback enumeration: frequency/interval-aware window [t - horizon, t]
  const horizon = enumerationHorizon(rule);
  const windowStart = epochToWallDate(
    Math.max(0, t - horizon),
    rule.tz,
    rule.unit,
  );
  const starts = rule.rrule.between(windowStart, wallT, true);

  for (const sd of starts) {
    const candidates = [
      sd.getTime(),
      floatingDateToZonedEpoch(sd, rule.tz, rule.unit),
    ];
    for (const start of candidates) {
      const end = computeOccurrenceEnd(rule, start);
      if (start <= t && t < end) return true;
    }
  }

  return false;
};
