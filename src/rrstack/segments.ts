/**
 * Streaming segments and range classification.
 * - getSegments: streaming, unit-aware, memory-bounded; no EPOCH_* usage.
 * - classifyRange: 'active' | 'blackout' | 'partial' by scanning segments.
 */

import type { CompiledRecurRule, CompiledRule } from './compile';
import {
  computeOccurrenceEnd,
  domainMax,
  domainMin,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from './coverage/time';
import type { InstantStatus, RangeStatus } from './types';
import { minBoundary } from './util/heap';

const cascadedStatus = (
  covering: boolean[],
  rules: CompiledRule[],
): InstantStatus => {
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
): Iterable<{ start: number; end: number; status: InstantStatus }> {
  if (!(from < to)) return;

  const limit = typeof opts?.limit === 'number' ? opts.limit : undefined;
  let emitted = 0;

  const n = rules.length;
  const covering = new Array<boolean>(n).fill(false);
  const nextStart = new Array<number | undefined>(n).fill(undefined);
  const nextEnd = new Array<number | undefined>(n).fill(undefined);
  // For span rules, carry their (clipped) end to set upon start boundary.
  const spanEnd = new Array<number | undefined>(n).fill(undefined);

  // Initialize per-rule state at "from"
  for (let i = 0; i < n; i++) {
    const r = rules[i];
    if (r.kind === 'span') {
      const s = typeof r.start === 'number' ? r.start : domainMin();
      const e = typeof r.end === 'number' ? r.end : domainMax(r.unit);
      // clip to window
      const sc = Math.max(s, from);
      const ec = Math.min(e, to);
      if (sc < ec) {
        spanEnd[i] = ec;
        if (sc <= from) {
          covering[i] = true;
          nextEnd[i] = ec;
        } else {
          nextStart[i] = sc;
        }
      }
      continue;
    }
    // recurring
    const recur = r;
    const last = lastStartBefore(recur, from);
    if (typeof last === 'number') {
      const e = computeOccurrenceEnd(recur, last);
      if (e > from) {
        covering[i] = true;
        nextEnd[i] = e;
      }
    }
    // next start at/after from
    const wallFrom = epochToWallDate(from, recur.tz, recur.unit);
    const d = recur.rrule.after(wallFrom, true);
    if (d) nextStart[i] = floatingDateToZonedEpoch(d, recur.tz, recur.unit);
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
        if (rules[i].kind === 'span') {
          nextEnd[i] = spanEnd[i];
          nextStart[i] = undefined;
        } else {
          const recur = rules[i] as CompiledRecurRule;
          const e = computeOccurrenceEnd(recur, t);
          nextEnd[i] = e;
          // advance nextStart for this rule
          const wallT = epochToWallDate(t, recur.tz, recur.unit);
          const d2 = recur.rrule.after(wallT, false);
          nextStart[i] = d2
            ? floatingDateToZonedEpoch(d2, recur.tz, recur.unit)
            : undefined;
        }
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
): RangeStatus => {
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
