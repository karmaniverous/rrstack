/**
 * Effective bounds (orchestrator).
 * - Delegates to focused modules for earliest/latest and open-end detection.
 */

import { computeEarliestStart } from './bounds/earliest';
import { computeLatestEnd } from './bounds/latest';
import { detectOpenEnd } from './bounds/openEnd';
import type { CompiledRule } from './compile';
import { domainMin, epochToWallDate } from './coverage/time';
import type { UnixTimeUnit } from './types';

/**
 * Compute effective active bounds across the entire rule set.
 *
 * @param rules - Compiled rules (order matters; later overrides earlier).
 * @returns Object with potential open sides:
 * - `start?: number` earliest active boundary (omitted if open),
 * - `end?: number` latest active boundary (omitted if open),
 * - `empty: boolean` true if no active coverage exists.
 * @remarks Delegates to focused passes and preserves original semantics.
 */
export const getEffectiveBounds = (
  rules: CompiledRule[],
): { start?: number; end?: number; empty: boolean } => {
  if (rules.length === 0) return { empty: true };

  const unit: UnixTimeUnit = rules[0].unit;
  const min = domainMin();

  // A finite "safety" probe for earliest-only logic; earliest uses it as a guard, not for far-future scans.
  const FAR_FUTURE_MS = Date.UTC(2099, 0, 1, 0, 0, 0);
  const probe =
    unit === 'ms' ? FAR_FUTURE_MS : Math.trunc(FAR_FUTURE_MS / 1000);

  // 1) Earliest bound (keeps existing small-sweep behavior; detects open-start)
  const earliestStart = computeEarliestStart(rules, min, probe);

  // 2) Open-ended detection (O(1) stack inspection)
  const openEndDetected = detectOpenEnd(rules);

  // 3) Latest bound (finite/local); skip when open-ended
  const latestEnd = openEndDetected ? undefined : computeLatestEnd(rules);

  // 4) Emptiness (no far-future probe)
  const empty =
    earliestStart === undefined &&
    latestEnd === undefined &&
    isCascadeInactiveEverywhere(rules);

  return {
    start: earliestStart,
    end: openEndDetected ? undefined : latestEnd,
    empty,
  };
};

/**
 * Cheap emptiness test:
 * - Not empty if any open-ended active source exists (baseline active, open-ended span, infinite recurrence with any start).
 * - Not empty if any finite active source exists (span with end > start, or recurrence with a first start).
 * - Otherwise empty.
 */
function isCascadeInactiveEverywhere(rules: CompiledRule[]): boolean {
  const min = domainMin();
  const hasAnyStart = (r: CompiledRule): boolean => {
    if (r.kind === 'span') {
      const s = typeof r.start === 'number' ? r.start : min;
      const e = typeof r.end === 'number' ? r.end : undefined;
      return typeof e === 'number' && e > s;
    }
    const d = r.rrule.after(epochToWallDate(min, r.tz, r.unit), true);
    return !!d;
  };

  // Any open-ended active source → not empty
  for (const r of rules) {
    if (r.effect === 'active' && r.isOpenEnd) {
      if (r.kind === 'span') return false;
      const hasUntil = !!(r.options as { until?: Date | null }).until;
      const hasCount =
        typeof (r.options as { count?: number | null }).count === 'number';
      if (!hasUntil && !hasCount) {
        // Verify existence
        if (hasAnyStart(r)) return false;
      }
    }
  }
  // Any finite active contributor exists → not empty
  for (const r of rules) {
    if (r.effect !== 'active') continue;
    if (hasAnyStart(r)) return false;
  }
  return true;
}
