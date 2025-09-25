/**
 * Latest-bound computation (finite probe + bounded backward sweep; no far-future scans).
 *
 * Strategy:
 * 1) If any open-ended active source exists (active open span or infinite recurrence with any start),
 *    the cascade is open-ended to the right ⇒ return undefined.
 * 2) Otherwise, compute a finite probe as the maximum end boundary across all finite contributors
 *    (spans with end; count- or until-bounded recurrences; blackout or active alike).
 * 3) Run a bounded reverse sweep starting from the probe to find the latest instant at which
 *    the cascade transitions from active to blackout. This honors cascade overlays (last-wins),
 *    without scanning from 1970 or to 2099.
 */
import type { CompiledRecurRule, CompiledRule } from '../compile';
import {
  computeOccurrenceEnd,
  domainMin,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from '../coverage/time';
import {
  cascadedStatus,
  coversAt,
  lastStartBefore,
  topCoveringIndex,
} from './common';
const hasAnyStart = (r: CompiledRecurRule): boolean =>
  !!r.rrule.after(epochToWallDate(domainMin(), r.tz, r.unit), true);

const hasOpenEndedActive = (rules: CompiledRule[]): boolean => {
  for (const r of rules) {
    if (r.effect !== 'active' || !r.isOpenEnd) continue;
    if (r.kind === 'span') return true;
    const recur = r;
    const hasUntil = !!(recur.options as { until?: Date | null }).until;
    const hasCount =
      typeof (recur.options as { count?: number | null }).count === 'number';
    if (!hasUntil && !hasCount && hasAnyStart(recur)) return true;
  }
  return false;
};

/** Compute a finite probe = max end across all finite contributors (active or blackout). */
const computeFiniteProbe = (rules: CompiledRule[]): number | undefined => {
  const ends: number[] = [];
  for (const r of rules) {
    if (r.kind === 'span') {
      if (typeof r.end === 'number') ends.push(r.end);
      continue;
    }
    const recur = r;
    const hasCount =
      typeof (recur.options as { count?: number | null }).count === 'number';
    const hasUntil = !!(recur.options as { until?: Date | null }).until;
    if (hasCount) {
      const starts = recur.rrule.all();
      if (starts.length > 0) {
        const d = starts[starts.length - 1];
        const s = floatingDateToZonedEpoch(d, recur.tz, recur.unit);
        ends.push(computeOccurrenceEnd(recur, s));
      }
      continue;
    }
    if (hasUntil) {
      const until = (recur.options as { until?: Date | null }).until!;
      // inclusive of a start at 'until'
      const d = recur.rrule.before(until, true);
      if (d) {
        const s = floatingDateToZonedEpoch(d, recur.tz, recur.unit);
        ends.push(computeOccurrenceEnd(recur, s));
      }
    }
  }
  if (ends.length === 0) return undefined;
  return Math.max(...ends);
};

export const computeLatestEnd = (rules: CompiledRule[]): number | undefined => {
  // 1) Open-ended to the right ⇒ no finite latest bound.
  if (hasOpenEndedActive(rules)) return undefined;

  // 2) Finite probe (max end across finite contributors).
  const probe = computeFiniteProbe(rules);
  if (probe === undefined) return undefined;

  // If the cascade is active immediately before the probe, the probe itself
  // is the latest active end (half-open intervals).
  const statusJustBefore = (t: number): 'active' | 'blackout' => {
    const min = domainMin();
    if (t <= min) return 'blackout';
    const testAt = t - 1;
    const coveringBefore = rules.map((r) => coversAt(r, testAt));
    return cascadedStatus(coveringBefore, rules);
  };
  if (statusJustBefore(probe) === 'active') {
    return probe;
  }
  // 3) Bounded reverse sweep from probe.
  const n = rules.length;
  const resetBackward = (
    cursor: number,
  ): {
    covering: boolean[];
    prevStart: (number | undefined)[];
    prevEnd: (number | undefined)[];
  } => {
    const covering = new Array<boolean>(n).fill(false);
    const prevStart = new Array<number | undefined>(n).fill(undefined);
    const prevEnd = new Array<number | undefined>(n).fill(undefined);

    for (let i = 0; i < n; i++) {
      const r = rules[i];
      if (r.kind === 'span') {
        const s = typeof r.start === 'number' ? r.start : domainMin();
        const e = typeof r.end === 'number' ? r.end : Number.POSITIVE_INFINITY;
        if (s < cursor) prevStart[i] = s;
        if (e < cursor) prevEnd[i] = e;
        if (e > cursor && s <= cursor) covering[i] = true;
        continue;
      }
      const recur = r;
      const prevCursor = cursor > domainMin() ? cursor - 1 : cursor;
      const s0 = lastStartBefore(recur, prevCursor);
      if (typeof s0 === 'number') {
        let s = s0;
        let e = computeOccurrenceEnd(recur, s);
        while (e > cursor) {
          const wallS = epochToWallDate(s, recur.tz, recur.unit);
          const sPrev = recur.rrule.before(wallS, false);
          if (!sPrev) break;
          s = floatingDateToZonedEpoch(sPrev, recur.tz, recur.unit);
          e = computeOccurrenceEnd(recur, s);
        }
        prevStart[i] = s;
        prevEnd[i] = e;
        if (e > cursor) covering[i] = true;
      }
    }
    return { covering, prevStart, prevEnd };
  };

  let { covering, prevStart, prevEnd } = resetBackward(probe);
  let cursor = probe;
  let guard = 0;

  const statusNow = cascadedStatus(covering, rules);
  if (statusNow === 'blackout') {
    while (guard++ < 100000) {
      let candidate: number | undefined = undefined;
      const top = topCoveringIndex(covering);
      if (typeof top === 'number') {
        if (typeof prevStart[top] === 'number' && prevStart[top] < cursor) {
          candidate = prevStart[top]!;
        }
        for (let j = top + 1; j < n; j++) {
          if (rules[j].effect === 'active' && typeof prevEnd[j] === 'number') {
            const v = prevEnd[j]!;
            if (
              v < cursor &&
              (typeof candidate !== 'number' || v > candidate)
            ) {
              candidate = v;
            }
          }
        }
      } else {
        for (let j = 0; j < n; j++) {
          if (rules[j].effect === 'active' && typeof prevEnd[j] === 'number') {
            const v = prevEnd[j]!;
            if (
              v < cursor &&
              (typeof candidate !== 'number' || v > candidate)
            ) {
              candidate = v;
            }
          }
        }
      }
      if (
        typeof candidate !== 'number' ||
        candidate <= domainMin() ||
        candidate >= cursor
      ) {
        break;
      }
      if (statusJustBefore(candidate) === 'active') {
        return candidate;
      }
      cursor = candidate;
      ({ covering, prevStart, prevEnd } = resetBackward(cursor));
    }
    return undefined;
  }

  // Fallback: reverse event-by-event sweep.
  let wasBlackout = cascadedStatus(covering, rules) === 'blackout';
  while (guard++ < 100000) {
    // Choose the latest boundary among previous starts/ends
    let t: number | undefined = undefined;
    for (let i = 0; i < n; i++) {
      const vS = prevStart[i];
      const vE = prevEnd[i];
      if (typeof vS === 'number' && (t === undefined || vS > t)) t = vS;
      if (typeof vE === 'number' && (t === undefined || vE > t)) t = vE;
    }
    if (t === undefined || t < domainMin()) break;

    for (let i = 0; i < n; i++) {
      if (prevEnd[i] === t) {
        covering[i] = true;
        if (rules[i].kind === 'span') {
          prevEnd[i] = undefined;
        } else {
          const recur = rules[i] as CompiledRecurRule;
          const s2 = prevStart[i];
          if (typeof s2 === 'number') {
            const wallS2 = epochToWallDate(s2, recur.tz, recur.unit);
            const sPrev = recur.rrule.before(wallS2, false);
            if (sPrev) {
              const sPrevEpoch = floatingDateToZonedEpoch(
                sPrev,
                recur.tz,
                recur.unit,
              );
              prevEnd[i] = computeOccurrenceEnd(recur, sPrevEpoch);
            } else {
              prevEnd[i] = undefined;
            }
          } else {
            prevEnd[i] = undefined;
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      if (prevStart[i] === t) {
        covering[i] = false;
        if (rules[i].kind === 'span') {
          prevStart[i] = undefined;
        } else {
          const recur = rules[i] as CompiledRecurRule;
          const wallS = epochToWallDate(t, recur.tz, recur.unit);
          const sPrev = recur.rrule.before(wallS, false);
          if (sPrev) {
            const sPrevEpoch = floatingDateToZonedEpoch(
              sPrev,
              recur.tz,
              recur.unit,
            );
            prevStart[i] = sPrevEpoch;
            prevEnd[i] = computeOccurrenceEnd(recur, sPrevEpoch);
          } else {
            prevStart[i] = undefined;
          }
        }
      }
    }

    const isActiveNow = cascadedStatus(covering, rules) === 'active';
    if (wasBlackout && isActiveNow) {
      return t;
    }
    wasBlackout = !isActiveNow;
  }
  // If we didn’t find an earlier transition, the finite probe is the latest end.
  // This covers pure-active or “tie at probe” cases without far-future scans.
  return probe;
};
