// Requirements addressed:
// - Frequency/interval-aware search horizon (unit-aware).
// - Enumerate candidate starts affecting a [from,to) window.

import type { CompiledRule } from '../compile';
import { Frequency } from '../rrule.runtime';
import { dayLength, epochToWallDate, floatingDateToZonedEpoch, horizonForDuration } from './time';

export const enumerationHorizon = (rule: CompiledRule): number => {
  const unit = rule.unit;
  const interval =
    typeof rule.options.interval === 'number' && rule.options.interval > 0
      ? rule.options.interval
      : 1;

  if (rule.options.freq === Frequency.YEARLY) {
    return (366 * interval + 1) * dayLength(unit);
  }
  if (rule.options.freq === Frequency.MONTHLY) {
    return (32 * interval + 1) * dayLength(unit);
  }
  return horizonForDuration(rule.duration, unit);
};
export const enumerateStarts = (  rule: CompiledRule,
  from: number,
  to: number,
  horizon: number,
): number[] => {
  const tz = rule.tz;
  const unit = rule.unit;
  const windowStart = epochToWallDate(from - Math.max(0, horizon), tz, unit);
  const windowEnd = epochToWallDate(to, tz, unit);
  const starts = rule.rrule.between(windowStart, windowEnd, true);
  return starts.map((d) => floatingDateToZonedEpoch(d, tz, unit));
};
