/**
 * Open-end detection relative to a far-future probe.
 */
import type { CompiledRule } from '../compile';
import { domainMin, epochToWallDate } from '../coverage/time';

export const detectOpenEnd = (
  rules: CompiledRule[],
  probe: number,
): boolean => {
  const wallProbePerRule = rules.map((r) =>
    r.kind === 'recur' ? epochToWallDate(probe, r.tz, r.unit) : null,
  );
  return rules.some((r, i) => {
    if (!(r.effect === 'active' && r.isOpenEnd)) return false;
    if (r.kind === 'span') {
      const s = typeof r.start === 'number' ? r.start : domainMin();
      return s <= probe;
    }
    const recur = r;
    const next = recur.rrule.after(wallProbePerRule[i] as Date, false);
    return !!next;
  });
};
