/**
 * Effective bounds:
 * - Independent of getSegments, scanning forward/backward with boundary probes.
 * - Supports open-ended detection.
 */

import type { CompiledRule } from './compile';
import { ruleCoversInstant } from './coverage';
import {
  computeOccurrenceEnd,
  domainMax,
  domainMin,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from './coverage/time';
import type { UnixTimeUnit } from './types';
import { maxBoundary, minBoundary } from './util/heap';

const cascadedStatus = (
  covering: boolean[],
  rules: CompiledRule[],
) => {
  for (let i = covering.length - 1; i >= 0; i--) {
    if (covering[i]) return rules[i].effect;
  }
  return 'blackout' as const;
};

// Find last start <= cursor; returns its epoch in unit or undefined.
const lastStartBefore = (
  rule: CompiledRule,
  cursor: number,
): number | undefined => {
  const wall = epochToWallDate(cursor, rule.tz, rule.unit);
  const d = rule.rrule.before(wall, true);
  if (!d) return undefined;
  return floatingDateToZonedEpoch(d, rule.tz, rule.unit);
};

/**
 * Compute effective active bounds across the entire rule set.
 *
 * @param rules - Compiled rules (order matters; later overrides earlier).
 * @returns Object with potential open sides:
 * - `start?: number` earliest active boundary (omitted if open),
 * - `end?: number` latest active boundary (omitted if open),
 * - `empty: boolean` true if no active coverage exists.
 * @remarks Uses forward/backward boundary scanning independent of
 *          {@link getSegments}, with targeted coverage probes to detect
 *          open-sided coverage.
 */
export const getEffectiveBounds = (
  rules: CompiledRule[],
): { start?: number; end?: number; empty: boolean } => {
  if (rules.length === 0) return { empty: true };

  const unit: UnixTimeUnit = rules[0].unit;
  const min = domainMin();
  const max = domainMax(unit);

  // Earliest: scan forward from domainMin, stop at first active segment.
  {
    const n = rules.length;
    const covering = new Array<boolean>(n).fill(false);
    const nextStart = new Array<number | undefined>(n).fill(undefined);
    const nextEnd = new Array<number | undefined>(n).fill(undefined);

    const wallMinPerRule = rules.map((r) => epochToWallDate(min, r.tz, r.unit));

    for (let i = 0; i < n; i++) {
      const d = rules[i].rrule.after(wallMinPerRule[i], true);
      nextStart[i] = d
        ? floatingDateToZonedEpoch(d, rules[i].tz, rules[i].unit)
        : undefined;
    }
    let prevStatus = cascadedStatus(covering, rules);
    let guard = 0;

    while (guard++ < 100000) {
      const t = minBoundary(nextStart, nextEnd);
      if (t === undefined || t > max) break;

      // ends before starts
      for (let i = 0; i < n; i++) {
        if (nextEnd[i] === t) {
          covering[i] = false;
          nextEnd[i] = undefined;
        }
      }
      for (let i = 0; i < n; i++) {
        if (nextStart[i] === t) {
          covering[i] = true;
          nextEnd[i] = computeOccurrenceEnd(rules[i], t);
          const wallT = epochToWallDate(t, rules[i].tz, rules[i].unit);
          const d2 = rules[i].rrule.after(wallT, false);
          nextStart[i] = d2
            ? floatingDateToZonedEpoch(d2, rules[i].tz, rules[i].unit)
            : undefined;
        }
      }
      const status = cascadedStatus(covering, rules);
      if (status !== prevStatus) {
        if (prevStatus === 'blackout' && status === 'active') {
          const start = t;
          const startUndefined =
            start === min &&
            rules.some(
              (r) =>
                r.effect === 'active' &&
                r.isOpenStart &&
                ruleCoversInstant(r, min + 1),
            );
          return {
            start: startUndefined ? undefined : start,
            end: undefined,
            empty: false,
          };
        }
        prevStatus = status;
      }
    }
  }

  // Latest: scan backward from domainMax, stop when active → blackout boundary passes.
  {
    const n = rules.length;
    const covering = new Array<boolean>(n).fill(false);
    const prevStart = new Array<number | undefined>(n).fill(undefined);
    const prevEnd = new Array<number | undefined>(n).fill(undefined);

    for (let i = 0; i < n; i++) {
      const last = lastStartBefore(rules[i], max);
      prevStart[i] = last;
      if (typeof last === 'number') {
        const e = computeOccurrenceEnd(rules[i], last);
        if (e > max) {
          covering[i] = true;
          prevEnd[i] = e;
        } else {
          covering[i] = false;
          prevEnd[i] = e;
        }
      }
    }

    let cursor = max;
    let prevCursor = cursor;
    let status = cascadedStatus(covering, rules);
    let guard = 0;

    while (guard++ < 100000) {
      const t = maxBoundary(prevStart, prevEnd);
      if (t === undefined || t < domainMin()) break;

      prevCursor = cursor;
      cursor = t;

      for (let i = 0; i < n; i++) {
        if (prevEnd[i] === t) {
          covering[i] = true;
          const s2 = prevStart[i];
          if (typeof s2 === 'number') {
            const wallS2 = epochToWallDate(s2, rules[i].tz, rules[i].unit);
            const sPrev = rules[i].rrule.before(wallS2, false);
            if (sPrev) {
              const sPrevEpoch = floatingDateToZonedEpoch(
                sPrev,
                rules[i].tz,
                rules[i].unit,
              );
              prevStart[i] = sPrevEpoch;
              prevEnd[i] = computeOccurrenceEnd(rules[i], sPrevEpoch);
            } else {
              prevStart[i] = undefined;
              prevEnd[i] = undefined;
            }
          } else {
            prevEnd[i] = undefined;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        if (prevStart[i] === t) {
          covering[i] = false;
          const wallS = epochToWallDate(t, rules[i].tz, rules[i].unit);
          const sPrev = rules[i].rrule.before(wallS, false);
          if (sPrev) {
            const sPrevEpoch = floatingDateToZonedEpoch(
              sPrev,
              rules[i].tz,
              rules[i].unit,
            );
            prevStart[i] = sPrevEpoch;
            prevEnd[i] = computeOccurrenceEnd(rules[i], sPrevEpoch);
          } else {
            prevStart[i] = undefined;
            prevEnd[i] = undefined;
          }
        }
      }

      const newStatus = cascadedStatus(covering, rules);
      if (status === 'active' && newStatus === 'blackout') {
        const end = prevCursor;
        const endUndefined =
          end === max &&
          rules.some(
            (r) =>
              r.effect === 'active' &&
              r.isOpenEnd &&
              ruleCoversInstant(r, max - 1),
          );
        return {
          start: undefined,
          end: endUndefined ? undefined : end,
          empty: false,
        };
      }
      status = newStatus;
    }
  }

  // No active coverage
  return { empty: true };
};
