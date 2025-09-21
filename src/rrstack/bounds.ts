/**
 * Effective bounds:
 * - Independent of getSegments, scanning forward/backward with boundary probes.
 * - Supports open-ended detection.
 */

import type { CompiledRecurRule,CompiledRule } from './compile';
import {
  computeOccurrenceEnd,
  domainMax,
  domainMin,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from './coverage/time';
import type { UnixTimeUnit } from './types';
import { maxBoundary } from './util/heap';

const cascadedStatus = (covering: boolean[], rules: CompiledRule[]) => {
  for (let i = covering.length - 1; i >= 0; i--) {
    if (covering[i]) return rules[i].effect;
  }
  return 'blackout' as const;
};

// Covered-at test via lastStartBefore + computed end (unit/timezone aware).
const coversAt = (rule: CompiledRule, t: number): boolean => {
  if (rule.kind === 'span') {
    const s = typeof rule.start === 'number' ? rule.start : domainMin();
    const e = typeof rule.end === 'number' ? rule.end : domainMax(rule.unit);
    return s <= t && t < e;
  }
  const recur = rule;
  const s = lastStartBefore(recur, t);
  if (typeof s !== 'number') return false;
  const e = computeOccurrenceEnd(recur, s);
  return s <= t && t < e;
};

// Index of highest-priority covering rule, or undefined when none cover.
const topCoveringIndex = (covering: boolean[]): number | undefined => {
  for (let i = covering.length - 1; i >= 0; i--) if (covering[i]) return i;
  return undefined;
};

// Find last start <= cursor; returns its epoch in unit or undefined.
const lastStartBefore = (
  rule: CompiledRule,
  cursor: number,
): number | undefined => {
  if (rule.kind === 'span') {
    const s = typeof rule.start === 'number' ? rule.start : domainMin();
    return s <= cursor ? s : undefined;
  }
  const recur = rule;
  const wall = epochToWallDate(cursor, recur.tz, recur.unit);
  const d = recur.rrule.before(wall, true);
  if (!d) return undefined;
  return floatingDateToZonedEpoch(d, recur.tz, recur.unit);
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

  // Safe far-future probe (avoid Date overflow near JS Date max range). Bound by domainMax.
  const FAR_FUTURE_MS = Date.UTC(2099, 0, 1, 0, 0, 0);
  const probeCandidate =
    unit === 'ms' ? FAR_FUTURE_MS : Math.trunc(FAR_FUTURE_MS / 1000);
  const max = domainMax(unit);
  const probe = probeCandidate > max ? max : probeCandidate;

  // Determine cascade status at the probe (cheap check) to aid empty detection.
  const coveringAtProbe = rules.map((r) => coversAt(r, probe));
  const statusAtProbe = cascadedStatus(coveringAtProbe, rules);

  let earliestStart: number | undefined = undefined;
  let latestEnd: number | undefined = undefined;
  // Fast-path pre-pass (earliest):
  // A0 = earliest start across active rules; B0 = earliest start across blackout rules.
  // If A0 exists and (B0 missing or A0 < B0), then A0 is the earliest global activation.
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
        earliestActiveCandidate === min &&
        rules.some((r) => r.effect === 'active' && r.isOpenStart);
      earliestStart = startUndefined ? undefined : earliestActiveCandidate;
    }
  }

  // Earliest: candidate-filtered jump sweep when pre-pass didn't decide.
  if (earliestStart === undefined) {
    const n = rules.length;
    // Reset state at an arbitrary cursor (covering/nextStart/nextEnd computed fresh).
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

    // Initialize at domainMin.
    let { covering, nextStart, nextEnd } = resetStateAt(min);
    let cursor = min;
    let guard = 0;
    while (guard++ < 100000) {
      // Status at current cursor.
      const statusNow = cascadedStatus(covering, rules);
      // If already active at cursor, earliest bound is here (with open-left check).
      if (statusNow === 'active') {
        const startUndefined =
          cursor === min &&
          rules.some(
            (r, i) => r.effect === 'active' && r.isOpenStart && covering[i],
          );
        earliestStart = startUndefined ? undefined : cursor;
        break;
      }

      // Blackout: only consider:
      // - end of the top covering blackout,
      // - starts of higher-priority active rules.
      // If no one covers, consider starts of all active rules.
      let candidate: number | undefined = undefined;
      const top = topCoveringIndex(covering);
      if (typeof top === 'number') {
        // End of the top interval (must be blackout since overall status is blackout).
        if (typeof nextEnd[top] === 'number') candidate = nextEnd[top];
        // Starts of higher-priority active rules.
        for (let j = top + 1; j < n; j++) {
          if (
            rules[j].effect === 'active' &&
            typeof nextStart[j] === 'number'
          ) {
            const v = nextStart[j]!;
            if (candidate === undefined || v < candidate) candidate = v;
          }
        }
      } else {
        // Baseline blackout: consider all active starts.
        for (let j = 0; j < n; j++) {
          if (
            rules[j].effect === 'active' &&
            typeof nextStart[j] === 'number'
          ) {
            const v = nextStart[j]!;
            if (candidate === undefined || v < candidate) candidate = v;
          }
        }
      }
      if (candidate === undefined || candidate > probe) break;

      // Jump to candidate and recompute complete state at that instant (ends before starts).
      cursor = candidate;
      ({ covering, nextStart, nextEnd } = resetStateAt(cursor));
      // Loop will evaluate status at new cursor at the top.
    }
  }

  // Open-ended end detection (early):
  // Consider coverage beyond the probe by checking whether any open-ended
  // active rule produces an occurrence strictly after the probe.
  const wallProbePerRule = rules.map((r) =>
    r.kind === 'recur' ? epochToWallDate(probe, r.tz, r.unit) : null,
  );
  const openEndDetected = rules.some((r, i) => {
    if (!(r.effect === 'active' && r.isOpenEnd)) return false;
    if (r.kind === 'span') {
      const s = typeof r.start === 'number' ? r.start : domainMin();
      return s <= probe; // open end extends beyond probe
    }
    const recur = r;
    const next = recur.rrule.after(wallProbePerRule[i] as Date, false);
    return !!next;
  });

  // Fast-path pre-pass (latest):
  // A1 = latest active end among rules with last start <= probe.
  // B1 = latest blackout end among rules with last start <= probe.
  // If A1 exists and (B1 missing or A1 > B1), then A1 is the latest global active end.
  if (!openEndDetected) {
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
      latestEnd = latestActiveEndCandidate;
    } else {
      // Latest: candidate-filtered jump sweep (backward). Fall back to
      // event-by-event only when current status at cursor is not blackout.
      const n = rules.length;
      const resetBackward = (
        cursor: number,
      ): {
        covering: boolean[];
        prevStart: Array<number | undefined>;
        prevEnd: Array<number | undefined>;
      } => {
        const covering = new Array<boolean>(n).fill(false);
        const prevStart = new Array<number | undefined>(n).fill(undefined);
        const prevEnd = new Array<number | undefined>(n).fill(undefined);
        for (let i = 0; i < n; i++) {
          // Seed strictly before the cursor to ensure progress when landing
          // exactly on a boundary (candidate == cursor).
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
            // Step back if the computed end is at/after the cursor so that
            // prevEnd < cursor holds, guaranteeing a strictly earlier candidate.
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

      // Helper: compute status just before a boundary t (half-open).
      const statusJustBefore = (t: number): 'active' | 'blackout' => {
        const min = domainMin();
        if (t <= min) return 'blackout';
        const testAt = t - 1; // works for ms and 's' since unit is integer
        const coveringBefore = rules.map((r) => coversAt(r, testAt));
        return cascadedStatus(coveringBefore, rules);
      };

      // If cascade is blackout, we can use candidate-filtered jumps.
      // Otherwise, fall back to fine-grained reverse sweep.
      const statusNow = cascadedStatus(covering, rules);
      if (statusNow === 'blackout') {
        while (guard++ < 100000) {
          // Build backward candidates under blackout:
          // - Start of top blackout (exit blackout going backward).
          // - Ends of higher-priority active rules (enter active going backward).
          let candidate: number | undefined = undefined;
          const top = topCoveringIndex(covering);
          if (typeof top === 'number') {
            // top must be blackout under overall blackout status
            if (typeof prevStart[top] === 'number' && prevStart[top] < cursor) {
              candidate = prevStart[top]!;
            }
            for (let j = top + 1; j < n; j++) {
              if (
                rules[j].effect === 'active' &&
                typeof prevEnd[j] === 'number'
              ) {
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
            // baseline blackout: any active's previous end could enter active
            for (let j = 0; j < n; j++) {
              if (
                rules[j].effect === 'active' &&
                typeof prevEnd[j] === 'number'
              ) {
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

          // If just before candidate the cascade is active, we've found the latest end.
          if (statusJustBefore(candidate) === 'active') {
            latestEnd = candidate;
            break;
          }

          // Otherwise, jump back to candidate and recompute backward state there.
          cursor = candidate;
          ({ covering, prevStart, prevEnd } = resetBackward(cursor));
          // Loop continues until we detect blackout->active in reverse.
        }
      } else {
        // Fallback: original reverse event-by-event sweep (robust on rare non-blackout starts).
        // Use a fresh evolving status to avoid TypeScript narrowing to a literal.
        let wasBlackout = cascadedStatus(covering, rules) === 'blackout';
        while (guard++ < 100000) {
          const t = maxBoundary(prevStart, prevEnd);
          if (t === undefined || t < domainMin()) break;

          // Crossing an end at t: entering the interval (backward).
          for (let i = 0; i < n; i++) {
            if (prevEnd[i] === t) {
              covering[i] = true;
              if (rules[i].kind === 'span') {
                prevEnd[i] = undefined;
              } else {
                const recur = rules[i] as CompiledRecurRule;
                const s2 = prevStart[i]; // current interval start
                if (typeof s2 === 'number') {
                  // keep current start to exit later; preload previous window's end.
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

          // Crossing a start at t: exiting the interval (backward).
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
          // Backward: blackout -> active indicates the latest forward end at t.
          if (wasBlackout && isActiveNow) {
            latestEnd = t;
            break;
          }
          wasBlackout = !isActiveNow;
        }
      }
    }
  }

  const empty =
    earliestStart === undefined &&
    latestEnd === undefined &&
    statusAtProbe === 'blackout';
  return {
    start: earliestStart,
    end: openEndDetected ? undefined : latestEnd,
    empty,
  };
};
