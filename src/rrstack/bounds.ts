/**
 * Effective bounds (orchestrator).
 * - Delegates to focused modules for earliest/latest and open-end detection.
 */

import { coversAt } from './bounds/common';
import { computeEarliestStart } from './bounds/earliest';
import { computeLatestEnd } from './bounds/latest';
import { detectOpenEnd } from './bounds/openEnd';
import type { CompiledRule } from './compile';
import { domainMax, domainMin } from './coverage/time';
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

  // Far-future probe bounded by domainMax.
  const FAR_FUTURE_MS = Date.UTC(2099, 0, 1, 0, 0, 0);
  const probeCandidate =
    unit === 'ms' ? FAR_FUTURE_MS : Math.trunc(FAR_FUTURE_MS / 1000);
  const max = domainMax(unit);
  const probe = probeCandidate > max ? max : probeCandidate;

  const statusAtProbe = ((): 'active' | 'blackout' => {
    const coveringAtProbe = rules.map((r) => coversAt(r, probe));
    for (let i = coveringAtProbe.length - 1; i >= 0; i--) {
      if (coveringAtProbe[i]) return rules[i].effect;
    }
    return 'blackout';
  })();

  const earliestStart = computeEarliestStart(rules, min, probe);

  // Open-ended detection
  const openEndDetected = detectOpenEnd(rules, probe);

  const latestEnd = openEndDetected
    ? undefined
    : computeLatestEnd(rules, probe);

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
