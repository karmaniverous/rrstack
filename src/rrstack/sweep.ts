/**
 * Requirements addressed:
 * - getSegments: contiguous non-empty segments partitioning [from,to) with cascaded status.
 * - classifyRange: 'active' | 'blackout' | 'partial'.
 * - getEffectiveBounds: earliest/latest active bounds with open-ended detection.
 * - Conservative horizon for enumeration (calendar units → 32/366 days).
 */

import { Duration } from 'luxon';
import { EPOCH_MAX_MS, EPOCH_MIN_MS, type instantStatus, type rangeStatus } from './types';
import type { CompiledRule } from './compile';
import { computeOccurrenceEndMs, enumerateStarts, ruleCoversInstant } from './coverage';

type Edge = { t: number; type: 'start' | 'end'; ruleIndex: number };

const horizonMsFor = (dur: Duration): number => {
  const v = dur.values;
  if ((v.years ?? 0) > 0) return 366 * 24 * 60 * 60 * 1000; // 366 days
  if ((v.months ?? 0) > 0) return 32 * 24 * 60 * 60 * 1000; // 32 days
  // For other units, safe millisecond conversion
  const ms = dur.as('milliseconds');
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms)) : 0;
};

const cascadedStatus = (covering: boolean[], rules: CompiledRule[]): instantStatus => {
  // baseline blackout; last covering rule wins
  for (let i = covering.length - 1; i >= 0; i--) {
    if (covering[i]) return rules[i].effect;
  }
  return 'blackout';
};

export function* getSegments(
  rules: CompiledRule[],
  fromMs: number = EPOCH_MIN_MS,
  toMs: number = EPOCH_MAX_MS,
): Iterable<{ start: number; end: number; status: instantStatus }> {
  const from = Math.max(fromMs, EPOCH_MIN_MS);
  const to = Math.min(toMs, EPOCH_MAX_MS);
  if (!(from < to)) return;

  const edges: Edge[] = [];
  rules.forEach((rule, idx) => {
    const horizon = horizonMsFor(rule.duration);
    const starts = enumerateStarts(rule, from, to, horizon);
    for (const s of starts) {
      const e = computeOccurrenceEndMs(rule, s);
      // clamp to [from,to)
      const start = Math.max(s, from);
      const end = Math.min(e, to);
      if (end <= from || start >= to) continue;
      if (start < end) {
        edges.push({ t: start, type: 'start', ruleIndex: idx });
        edges.push({ t: end, type: 'end', ruleIndex: idx });
      }
    }
  });
  // sentinel end edge
  edges.push({ t: to, type: 'end', ruleIndex: -1 });

  edges.sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t;
    // end before start at same timestamp
    if (a.type !== b.type) return a.type === 'end' ? -1 : 1;
    return a.ruleIndex - b.ruleIndex;
  });

  const covering = new Array<boolean>(rules.length).fill(false);
  // status at from
  for (let i = 0; i < rules.length; i++) {
    covering[i] = ruleCoversInstant(rules[i], from);
  }
  let prevT = from;
  let prevStatus = cascadedStatus(covering, rules);

  for (const e of edges) {
    if (e.t > prevT) {
      yield { start: prevT, end: e.t, status: prevStatus };
      prevT = e.t;
    }
    if (e.ruleIndex >= 0) {
      if (e.type === 'start') covering[e.ruleIndex] = true;
      else covering[e.ruleIndex] = false;
      prevStatus = cascadedStatus(covering, rules);
    }
  }
}

export const classifyRange = (
  rules: CompiledRule[],
  fromMs: number,
  toMs: number,
): rangeStatus => {
  let sawActive = false;
  let sawBlackout = false;
  for (const seg of getSegments(rules, fromMs, toMs)) {
    if (seg.status === 'active') sawActive = true;
    else sawBlackout = true;
    if (sawActive && sawBlackout) return 'partial';
  }
  if (sawActive && !sawBlackout) return 'active';
  if (!sawActive && sawBlackout) return 'blackout';
  // No segments => empty window; treat as blackout baseline
  return 'blackout';
};

export const getEffectiveBounds = (
  rules: CompiledRule[],
): { start?: number; end?: number; empty: boolean } => {
  let firstActiveStart: number | undefined;
  let lastActiveEnd: number | undefined;
  for (const seg of getSegments(rules, EPOCH_MIN_MS, EPOCH_MAX_MS)) {
    if (seg.status !== 'active') continue;
    if (firstActiveStart === undefined) firstActiveStart = seg.start;
    lastActiveEnd = seg.end;
  }
  if (firstActiveStart === undefined) {
    return { empty: true };
  }

  // Undefined-side logic
  const startUndefined =
    firstActiveStart === EPOCH_MIN_MS &&
    rules.some((r) => r.effect === 'active' && r.isOpenStart && ruleCoversInstant(r, EPOCH_MIN_MS));

  const endUndefined =
    lastActiveEnd === EPOCH_MAX_MS &&
    rules.some(
      (r) => r.effect === 'active' && r.isOpenEnd && ruleCoversInstant(r, EPOCH_MAX_MS - 1),
    );

  return {
    start: startUndefined ? undefined : firstActiveStart,
    end: endUndefined ? undefined : lastActiveEnd,
    empty: false,
  };
};
