/**
 * Open-end detection without far-future probes.
 *
 * Decide cascade open-endedness by stack inspection:
 * - The cascade is open-ended iff the last open-ended candidate is an active source.
 * - Open-ended sources:
 *   • Active span with open end,
 *   • Active recurrence with no until and no count (and at least one occurrence),
 *   • Baseline active (compiled as open span).
 * - A blackout open-ended span closes the future starting at its start; it is not open-ended.
 */
import type {
  CompiledRecurRule,
  CompiledRule,
  CompiledSpanRule,
} from '../compile';
import { domainMin, epochToWallDate } from '../coverage/time';

export const detectOpenEnd = (rules: CompiledRule[]): boolean => {
  let lastKind: 'active' | 'blackout' | undefined;
  const min = domainMin();
  const hasAnyStart = (r: CompiledRecurRule): boolean => {
    const wall = epochToWallDate(min, r.tz, r.unit);
    const d = r.rrule.after(wall, true);
    return !!d;
  };

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];

    // Open-ended active span
    if (r.effect === 'active' && r.kind === 'span' && r.isOpenEnd) {
      lastKind = 'active';
      continue;
    }

    // Open-ended active recurrence (no until/count), must actually produce occurrences
    if (r.effect === 'active' && r.kind === 'recur' && r.isOpenEnd) {
      const hasUntil = !!(r.options as { until?: Date | null }).until;
      const hasCount =
        typeof (r.options as { count?: number | null }).count === 'number';
      if (!hasUntil && !hasCount && hasAnyStart(r)) {
        lastKind = 'active';
        continue;
      }
    }

    // Open-ended blackout span
    if (r.effect === 'blackout' && r.kind === 'span' && r.isOpenEnd) {
      lastKind = 'blackout';
    }
  }

  return lastKind === 'active';
};
