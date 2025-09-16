/**
 * Streaming segments and range classification.
 * - getSegments: streaming, unit-aware, memory-bounded; no EPOCH_* usage.
 * - classifyRange: 'active' | 'blackout' | 'partial' by scanning segments.
 */

import type { CompiledRule } from './compile';
import {
  computeOccurrenceEnd,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from './coverage/time';
import type { instantStatus, rangeStatus } from './types';
import { minBoundary } from './util/heap';

const cascadedStatus = (
  covering: boolean[],
  rules: CompiledRule[],
): instantStatus => {
  for (let i = covering.length - 1; i >= 0; i--) {
    if (covering[i]) return rules[i].effect;
  }
  return 'blackout';
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
 * Stream contiguous active/blackout segments over `[from, to)`.
 *
 * @param rules - Compiled rule set (later rules override earlier ones).
 * @param from - Start of the window (inclusive), in the configured unit.
 * @param to - End of the window (exclusive), in the configured unit.
 * @param opts - Optional settings (`limit` caps yielded segments; throws if exceeded).
 * @returns A memory-bounded iterable of `{ start, end, status }` entries.
 * @remarks Ends are computed in the rule timezone (DST-correct) and honor
 *          half-open semantics; in 's' mode ends are rounded up.
 */
export function* getSegments(
  rules: CompiledRule[],
  from: number,
  to: number,
  opts?: { limit?: number },
): Iterable<{ start: number; end: number; status: instantStatus }> {
  if (!(from < to)) return;

  const limit = typeof opts?.limit === 'number' ? opts.limit : undefined;
  let emitted = 0;

  const n = rules.length;
  const covering = new Array<boolean>(n).fill(false);
  const nextStart = new Array<number | undefined>(n).fill(undefined);
  const nextEnd = new Array<number | undefined>(n).fill(undefined);

  // Initialize per-rule state at "from"
  for (let i = 0; i < n; i++) {
    const r = rules[i];
    const last = lastStartBefore(r, from);
    if (typeof last === 'number') {
      const e = computeOccurrenceEnd(r, last);
      if (e > from) {
        covering[i] = true;
        nextEnd[i] = e;
      }
    }
    // next start at/after from
    const wallFrom = epochToWallDate(from, r.tz, r.unit);
    const d = r.rrule.after(wallFrom, true);
    if (d) nextStart[i] = floatingDateToZonedEpoch(d, r.tz, r.unit);
  }

  let prevT = from;
  let prevStatus = cascadedStatus(covering, rules);

  for (;;) {
    const t = minBoundary(nextStart, nextEnd);
    if (t === undefined || t >= to) {
      if (prevT < to) {
        if (typeof limit === 'number' && emitted >= limit) {
          throw new Error('getSegments: segment limit exceeded');
        }
        yield { start: prevT, end: to, status: prevStatus };
        emitted++;
      }
      return;
    }

    // ends before starts at same timestamp
    for (let i = 0; i < n; i++) {
      if (nextEnd[i] === t) {
        covering[i] = false;
        nextEnd[i] = undefined;
      }
    }
    for (let i = 0; i < n; i++) {
      if (nextStart[i] === t) {
        covering[i] = true;
        const e = computeOccurrenceEnd(rules[i], t);
        nextEnd[i] = e;
        // advance nextStart for this rule
        const wallT = epochToWallDate(t, rules[i].tz, rules[i].unit);
        const d2 = rules[i].rrule.after(wallT, false);
        nextStart[i] = d2
          ? floatingDateToZonedEpoch(d2, rules[i].tz, rules[i].unit)
          : undefined;
      }
    }

    const status = cascadedStatus(covering, rules);
    if (status !== prevStatus) {
      if (prevT < t) {
        if (typeof limit === 'number' && emitted >= limit) {
          throw new Error('getSegments: segment limit exceeded');
        }
        yield { start: prevT, end: t, status: prevStatus };
        emitted++;
      }
      prevT = t;
      prevStatus = status;
    }
  }
}

/**
 * Classify the window `[from, to)` as a whole.
 * @param rules - Compiled rule set.
 * @param from - Window start (inclusive).
 * @param to - Window end (exclusive).
 * @returns `'active' | 'blackout' | 'partial'`
 */
export const classifyRange = (
  rules: CompiledRule[],
  from: number,
  to: number,
): rangeStatus => {
  let sawActive = false;
  let sawBlackout = false;
  for (const seg of getSegments(rules, from, to)) {
    if (seg.status === 'active') sawActive = true;
    else sawBlackout = true;
    if (sawActive && sawBlackout) return 'partial';
  }
  if (sawActive && !sawBlackout) return 'active';
  if (!sawActive && sawBlackout) return 'blackout';
  return 'blackout';
};