/**
 * Common helpers for effective-bounds computations.
 * - Shared across earliest/latest passes.
 */
import type { CompiledRule } from '../compile';
import {
  computeOccurrenceEnd,
  domainMax,
  domainMin,
  epochToWallDate,
  floatingDateToZonedEpoch,
} from '../coverage/time';

export const cascadedStatus = (
  covering: boolean[],
  rules: CompiledRule[],
): 'active' | 'blackout' => {
  for (let i = covering.length - 1; i >= 0; i--) {
    if (covering[i]) return rules[i].effect;
  }
  return 'blackout';
};

export const topCoveringIndex = (covering: boolean[]): number | undefined => {
  for (let i = covering.length - 1; i >= 0; i--) if (covering[i]) return i;
  return undefined;
};

/**
 * Find last start ≤ cursor; returns its epoch in unit or undefined.
 */
export const lastStartBefore = (
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
 * Covered-at test via lastStartBefore + computed end (unit/timezone aware).
 */
export const coversAt = (rule: CompiledRule, t: number): boolean => {
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
