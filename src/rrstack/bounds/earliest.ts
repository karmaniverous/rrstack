/**
 * Earliest-bound computation.
 */
import type { CompiledRecurRule, CompiledRule } from '../compile';
import {
  computeOccurrenceEnd,
  domainMax,
  domainMin,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from '../coverage/time';
import {
  cascadedStatus,
  lastStartBefore,
  topCoveringIndex,
} from './common';

/**
 * Compute earliest active start across the rule set.
 * @param rules Compiled rules (later override earlier).
 * @param min Domain minimum (unit-aware).
 * @param probe Far-future probe (unit-aware) to bound forward jumps.
 */
export const computeEarliestStart = (
  rules: CompiledRule[],
  min: number,
  probe: number,
): number | undefined => {
  let earliestStart: number | undefined = undefined;

  // Fast-path pre-pass (earliest):
  // A0 = earliest start across active rules; B0 = earliest start across blackout rules.
  {
    const n = rules.length;
    const wallMinPerRule = rules.map((r) =>
      r.kind === 'recur' ? epochToWallDate(min, r.tz, r.unit) : null,
    );
    let earliestActiveCandidate: number | undefined = undefined;
    let earliestBlackoutCandidate: number | undefined = undefined;

    for (let i = 0; i < n; i++) {
      const r = rules[i];
      let t: number | undefined;
      if (r.kind === 'recur') {
        const d = (r).rrule.after(
          wallMinPerRule[i] as Date,
          true,
        );
        if (!d) continue;
        t = floatingDateToZonedEpoch(d, r.tz, r.unit);
      } else {
        // span: earliest candidate is the (possibly open) start clamp
        t = typeof r.start === 'number' ? r.start : min;
        // If the span ends before min, ignore
        const e = typeof r.end === 'number' ? r.end : domainMax(r.unit);
        if (e <= min) t = undefined;
      }
      if (typeof t !== 'number') continue;
      if (r.effect === 'active') {
        if (
          earliestActiveCandidate === undefined ||
          t < earliestActiveCandidate
        ) {
          earliestActiveCandidate = t;
        }
      } else {
        if (
          earliestBlackoutCandidate === undefined ||
          t < earliestBlackoutCandidate
        ) {
          earliestBlackoutCandidate = t;
        }
      }
    }

    if (
      typeof earliestActiveCandidate === 'number' &&
      (typeof earliestBlackoutCandidate !== 'number' ||
        earliestActiveCandidate < earliestBlackoutCandidate)
    ) {
      const startUndefined =
        earliestActiveCandidate === domainMin() &&
        rules.some((r) => r.effect === 'active' && r.isOpenStart);
      earliestStart = startUndefined ? undefined : earliestActiveCandidate;
    }
  }

  if (earliestStart !== undefined) return earliestStart;

  // Candidate-filtered jump sweep when pre-pass didn't decide.
  const n = rules.length;
  const resetStateAt = (
    cursor: number,
  ): {
    covering: boolean[];
    nextStart: Array<number | undefined>;
    nextEnd: Array<number | undefined>;
  } => {
    const covering = new Array<boolean>(n).fill(false);
    const nextStart = new Array<number | undefined>(n).fill(undefined);
    const nextEnd = new Array<number | undefined>(n).fill(undefined);
    for (let i = 0; i < n; i++) {
      const r = rules[i];
      if (r.kind === 'span') {
        const s = typeof r.start === 'number' ? r.start : domainMin();
        const e = typeof r.end === 'number' ? r.end : domainMax(r.unit);
        if (s <= cursor && e > cursor) {
          covering[i] = true;
          nextEnd[i] = e;
        } else {
          nextEnd[i] = undefined;
          nextStart[i] = s >= cursor ? s : undefined;
        }
        continue;
      }
      const recur = r;
      const s = lastStartBefore(recur, cursor);
      const wallT = epochToWallDate(cursor, recur.tz, recur.unit);
      if (typeof s === 'number') {
        const e = computeOccurrenceEnd(recur, s);
        if (e > cursor) {
          covering[i] = true;
          nextEnd[i] = e;
        }
        const dAfter = recur.rrule.after(wallT, false);
        nextStart[i] = dAfter
          ? floatingDateToZonedEpoch(dAfter, recur.tz, recur.unit)
          : undefined;
      } else {
        const d0 = recur.rrule.after(wallT, true);
        nextStart[i] = d0
          ? floatingDateToZonedEpoch(d0, recur.tz, recur.unit)
          : undefined;
      }
    }
    return { covering, nextStart, nextEnd };
  };

  let { covering, nextStart, nextEnd } = resetStateAt(min);
  let cursor = min;
  let guard = 0;
  while (guard++ < 100000) {
    const statusNow = cascadedStatus(covering, rules);
    if (statusNow === 'active') {
      const startUndefined =
        cursor === domainMin() &&
        rules.some(
          (r, i) => r.effect === 'active' && r.isOpenStart && covering[i],
        );
      earliestStart = startUndefined ? undefined : cursor;
      break;
    }
    // Consider next candidate boundary
    let candidate: number | undefined = undefined;
    const top = topCoveringIndex(covering);
    if (typeof top === 'number') {
      if (typeof nextEnd[top] === 'number') candidate = nextEnd[top];
      for (let j = top + 1; j < n; j++) {
        if (rules[j].effect === 'active' && typeof nextStart[j] === 'number') {
          const v = nextStart[j]!;
          if (candidate === undefined || v < candidate) candidate = v;
        }
      }
    } else {
      for (let j = 0; j < n; j++) {
        if (rules[j].effect === 'active' && typeof nextStart[j] === 'number') {
          const v = nextStart[j]!;
          if (candidate === undefined || v < candidate) candidate = v;
        }
      }
    }
    if (candidate === undefined || candidate > probe) break;
    cursor = candidate;
    ({ covering, nextStart, nextEnd } = resetStateAt(cursor));
  }

  return earliestStart;
};
