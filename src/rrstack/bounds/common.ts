/**
 * Common helpers for effective-bounds computations.
 * - Shared across earliest/latest passes.
 */
import type { CompiledRule } from '../compile';
import {
  isSimpleSubDaily,
  nearestOccurrenceBefore,
} from '../coverage/arithmetic';
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
    if (covering[i]) return rules[i].effect as 'active' | 'blackout';
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
  if (rule.kind === 'event' || rule.kind === 'oneTimeEvent') return undefined;
  // O(1) fast path for simple sub-daily rules.
  if (isSimpleSubDaily(rule)) {
    return nearestOccurrenceBefore(rule, cursor);
  }
  const wall = epochToWallDate(cursor, rule.tz, rule.unit);
  const d = rule.rrule.before(wall, true);
  if (!d) return undefined;
  return floatingDateToZonedEpoch(d, rule.tz, rule.unit);
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
  if (rule.kind === 'event' || rule.kind === 'oneTimeEvent') return false;
  const s = lastStartBefore(rule, t);
  if (typeof s !== 'number') return false;
  const e = computeOccurrenceEnd(rule, s);
  return s <= t && t < e;
};
