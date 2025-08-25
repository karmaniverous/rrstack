/**
 * Effective bounds:
 * - Independent of getSegments, scanning forward/backward with boundary probes.
 * - Supports open-ended detection.
 */

import type { CompiledRule } from './compile';
import {
  computeOccurrenceEnd,
  domainMin,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from './coverage/time';
import type { UnixTimeUnit } from './types';
import { maxBoundary, minBoundary } from './util/heap';

const cascadedStatus = (covering: boolean[], rules: CompiledRule[]) => {
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
 * @remarks Scans forward for earliest blackout→active transition, and scans
 *          backward from a safe far-future probe to capture latest end.
 */
export const getEffectiveBounds = (
  rules: CompiledRule[],
): { start?: number; end?: number; empty: boolean } => {
  if (rules.length === 0) return { empty: true };

  const unit: UnixTimeUnit = rules[0].unit;
  const min = domainMin();

  // Safe far-future probe (avoid Date overflow near JS Date max range).
  const FAR_FUTURE_MS = Date.UTC(2099, 0, 1, 0, 0, 0);
  const probe =
    unit === 'ms' ? FAR_FUTURE_MS : Math.trunc(FAR_FUTURE_MS / 1000);

  let earliestStart: number | undefined = undefined;
  let latestEnd: number | undefined = undefined;

  // Earliest: scan forward from domainMin, stop at first blackout→active.
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
      if (t === undefined || t > probe) break;

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
      if (prevStatus === 'blackout' && status === 'active') {
        const start = t;
        const startUndefined =
          start === min &&
          rules.some((r) => r.effect === 'active' && r.isOpenStart);
        earliestStart = startUndefined ? undefined : start;
        break;
      }
      prevStatus = status;
    }
  }

  // Latest: scan backward from a safe far-future probe; capture first blackout→active (reverse).
  {
    const n = rules.length;
    const covering = new Array<boolean>(n).fill(false);
    const prevStart = new Array<number | undefined>(n).fill(undefined);
    const prevEnd = new Array<number | undefined>(n).fill(undefined);

    for (let i = 0; i < n; i++) {
      const last = lastStartBefore(rules[i], probe);
      prevStart[i] = last;
      if (typeof last === 'number') {
        const e = computeOccurrenceEnd(rules[i], last);
        // initialize to enter this occurrence at its end when scanning backward
        prevEnd[i] = e;
      }
    }

    let status = cascadedStatus(covering, rules);
    let guard = 0;

    while (guard++ < 100000) {
      const t = maxBoundary(prevStart, prevEnd);
      if (t === undefined || t < domainMin()) break;

      // Crossing an end at t: entering the interval (backward).
      for (let i = 0; i < n; i++) {
        if (prevEnd[i] === t) {
          covering[i] = true;
          const s2 = prevStart[i]; // current interval start
          if (typeof s2 === 'number') {
            // keep current start to exit later; preload previous window's end.
            prevStart[i] = s2;
            const wallS2 = epochToWallDate(s2, rules[i].tz, rules[i].unit);
            const sPrev = rules[i].rrule.before(wallS2, false);
            if (sPrev) {
              const sPrevEpoch = floatingDateToZonedEpoch(
                sPrev,
                rules[i].tz,
                rules[i].unit,
              );
              prevEnd[i] = computeOccurrenceEnd(rules[i], sPrevEpoch);
            } else {
              prevEnd[i] = undefined;
            }
          } else {
            prevEnd[i] = undefined;
          }
        }
      }

      // Crossing a start at t: exiting the interval (backward).
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
          }
        }
      }

      const newStatus = cascadedStatus(covering, rules);
      // Backward: blackout -> active indicates the latest forward end at t.
      if (status === 'blackout' && newStatus === 'active') {
        latestEnd = t;
        break;
      }
      status = newStatus;
    }
  }

  const empty = earliestStart === undefined && latestEnd === undefined;
  return { start: earliestStart, end: latestEnd, empty };
};
