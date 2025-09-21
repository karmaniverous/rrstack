/**
 * Latest-bound computation.
 */
import type { CompiledRecurRule, CompiledRule } from '../compile';
import {
  computeOccurrenceEnd,
  domainMax,
  domainMin,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from '../coverage/time';
import { maxBoundary } from '../util/heap';
import {
  cascadedStatus,
  coversAt,
  lastStartBefore,
  topCoveringIndex,
} from './common';

/**
 * Compute latest active end across the rule set (finite).
 * Caller should suppress the value when open-ended coverage is detected.
 */
export const computeLatestEnd = (
  rules: CompiledRule[],
  probe: number,
): number | undefined => {
  // Fast-path pre-pass (latest):
  // A1 = latest active end among rules with last start <= probe.
  // B1 = latest blackout end among rules with last start <= probe.
  let latestActiveEndCandidate: number | undefined = undefined;
  let latestBlackoutEndCandidate: number | undefined = undefined;

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    const last = lastStartBefore(r, probe);
    if (typeof last !== 'number') continue;
    const e =
      r.kind === 'span'
        ? typeof r.end === 'number'
          ? r.end
          : domainMax(r.unit)
        : computeOccurrenceEnd(r, last);
    if (r.effect === 'active') {
      if (
        latestActiveEndCandidate === undefined ||
        e > latestActiveEndCandidate
      ) {
        latestActiveEndCandidate = e;
      }
    } else {
      if (
        latestBlackoutEndCandidate === undefined ||
        e > latestBlackoutEndCandidate
      ) {
        latestBlackoutEndCandidate = e;
      }
    }
  }

  if (
    typeof latestActiveEndCandidate === 'number' &&
    (typeof latestBlackoutEndCandidate !== 'number' ||
      latestActiveEndCandidate > latestBlackoutEndCandidate)
  ) {
    return latestActiveEndCandidate;
  }

  // Candidate-filtered jump sweep (backward). Fall back to event-by-event only
  // when current status at cursor is not blackout.
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
      const prevCursor = cursor > domainMin() ? cursor - 1 : cursor;
      const r = rules[i];
      if (r.kind === 'span') {
        const s = typeof r.start === 'number' ? r.start : domainMin();
        const e = typeof r.end === 'number' ? r.end : domainMax(r.unit);
        if (s < cursor) prevStart[i] = s;
        if (e < cursor) prevEnd[i] = e;
        if (e > cursor && s <= cursor) covering[i] = true;
        continue;
      }
      const recur = r;
      const s0 = lastStartBefore(recur, prevCursor);
      if (typeof s0 === 'number') {
        let s = s0;
        let e = computeOccurrenceEnd(recur, s);
        while (e >= cursor) {
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

  const statusJustBefore = (t: number): 'active' | 'blackout' => {
    const min = domainMin();
    if (t <= min) return 'blackout';
    const testAt = t - 1;
    const coveringBefore = rules.map((r) => coversAt(r, testAt));
    return cascadedStatus(coveringBefore, rules);
  };

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
      )
        break;
      if (statusJustBefore(candidate) === 'active') {
        return candidate;
      }
      cursor = candidate;
      ({ covering, prevStart, prevEnd } = resetBackward(cursor));
    }
    return undefined;
  }

  // Fallback: original reverse event-by-event sweep.
  let wasBlackout = cascadedStatus(covering, rules) === 'blackout';
  while (guard++ < 100000) {
    const t = maxBoundary(prevStart, prevEnd);
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
            prevStart[i] = s2;
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
  return undefined;
};
