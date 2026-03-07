/**
 * Requirements addressed:
 * - Thin query façade to keep RRStack.ts focused and short.
 * - Reuse existing streaming and coverage services.
 */

import type { CompiledAnyEventRule, CompiledRule } from './compile';
import { ruleCoversInstant } from './coverage';
import { epochToWallDate, floatingDateToZonedEpoch } from './coverage/time';
import { classifyRange, getEffectiveBounds, getSegments } from './sweep';
import type { RangeStatus } from './types';

export const isActiveAtCompiled = (
  compiled: CompiledRule[],
  t: number,
): boolean => {
  let isActive = false;
  for (const r of compiled) {
    if (ruleCoversInstant(r, t)) {
      isActive = r.effect === 'active';
    }
  }
  return isActive;
};

export const getSegmentsOverWindow = (
  compiled: CompiledRule[],
  from: number,
  to: number,
  opts?: { limit?: number },
): Iterable<{ start: number; end: number; status: 'active' | 'blackout' }> =>
  getSegments(compiled, from, to, opts);

export const classifyRangeOverWindow = (
  compiled: CompiledRule[],
  from: number,
  to: number,
): RangeStatus => classifyRange(compiled, from, to);

export const getEffectiveBoundsFromCompiled = (compiled: CompiledRule[]) =>
  getEffectiveBounds(compiled);

/**
 * Enumerate event instants in [from, to) that survive the coverage cascade.
 * Events are yielded in chronological order. An event at time T is suppressed
 * if the coverage cascade classifies T as 'blackout'.
 *
 * @param coverageRules - Compiled coverage rules (with baseline prepended).
 * @param eventRules - Compiled event rules.
 * @param from - Window start (inclusive).
 * @param to - Window end (exclusive).
 */
export function* getEventsInRange(
  coverageRules: CompiledRule[],
  eventRules: CompiledAnyEventRule[],
  from: number,
  to: number,
): Iterable<{ at: number; label?: string }> {
  if (eventRules.length === 0 || !(from < to)) return;

  // Collect all candidate event instants from all event rules
  const candidates: { at: number; label?: string }[] = [];

  for (const rule of eventRules) {
    if (rule.kind === 'oneTimeEvent') {
      // One-time event: check if `at` falls within [from, to)
      if (rule.at >= from && rule.at < to) {
        candidates.push({ at: rule.at, label: rule.label });
      }
      continue;
    }
    const wallFrom = epochToWallDate(from, rule.tz, rule.unit);
    const wallTo = epochToWallDate(to, rule.tz, rule.unit);
    // rrule.between with inc=true includes starts at exactly 'from'
    const occurrences = rule.rrule.between(wallFrom, wallTo, true);
    for (const d of occurrences) {
      const at = floatingDateToZonedEpoch(d, rule.tz, rule.unit);
      if (at >= from && at < to) {
        candidates.push({ at, label: rule.label });
      }
    }
  }

  // Sort chronologically
  candidates.sort((a, b) => a.at - b.at);

  // Filter by coverage: only yield events where the cascade is active
  for (const evt of candidates) {
    if (isActiveAtCompiled(coverageRules, evt.at)) {
      yield evt;
    }
  }
}
