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
  domainMax,
  domainMin,
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
  // Span: simple half-open range check with open sides
  if (rule.kind === 'span') {
    const s = typeof rule.start === 'number' ? rule.start : domainMin();
    const e = typeof rule.end === 'number' ? rule.end : domainMax(rule.unit);
    return s <= t && t < e;
  }
  const recur = rule;

  // 0) Day-window enumeration: all starts occurring on local calendar day of t.
  {
    const local =
      recur.unit === 'ms'
        ? DateTime.fromMillis(t, { zone: recur.tz })
        : DateTime.fromSeconds(t, { zone: recur.tz });
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

    const dayStarts = recur.rrule.between(
      dayStartWall,
      dayEndWallExclusive,
      true,
    );
    for (const sd of dayStarts) {
      const candidates = [
        sd.getTime(),
        floatingDateToZonedEpoch(sd, recur.tz, recur.unit),
      ];
      for (const start of candidates) {
        const end = computeOccurrenceEnd(recur, start);
        if (start <= t && t < end) return true;
      }
    }

    if (localDayMatchesDailyTimes(recur, t)) return true;
    if (localDayMatchesCommonPatterns(recur, t)) return true;
  }

  // 1) Robust coverage via rrule.before at wall-clock t.
  const wallT = epochToWallDate(t, recur.tz, recur.unit);
  const d = recur.rrule.before(wallT, true);
  if (d) {
    const startEpoch = d.getTime();
    const endEpoch = computeOccurrenceEnd(recur, startEpoch);
    if (startEpoch <= t && t < endEpoch) return true;

    const startFloat = floatingDateToZonedEpoch(d, recur.tz, recur.unit);
    const endFloat = computeOccurrenceEnd(recur, startFloat);
    if (startFloat <= t && t < endFloat) return true;
  }

  // 2) Fallback enumeration: frequency/interval-aware window [t - horizon, t]
  const horizon = enumerationHorizon(recur);
  const windowStart = epochToWallDate(
    Math.max(0, t - horizon),
    recur.tz,
    recur.unit,
  );
  const starts = recur.rrule.between(windowStart, wallT, true);

  for (const sd of starts) {
    const candidates = [
      sd.getTime(),
      floatingDateToZonedEpoch(sd, recur.tz, recur.unit),
    ];
    for (const start of candidates) {
      const end = computeOccurrenceEnd(recur, start);
      if (start <= t && t < end) return true;
    }
  }

  return false;
};
