import { DateTime } from 'luxon';

import type { DescribeConfig } from '../../config';
import type { RuleDescriptorRecur } from '../../descriptor';

export type LimitsMode = NonNullable<DescribeConfig['limits']>;

export const appendLimits = (
  phrase: string,
  d: RuleDescriptorRecur,
  mode: LimitsMode = 'none',
): string => {
  if (mode === 'none') return phrase;
  const appendDates = mode === 'dateOnly' || mode === 'dateAndCount';
  const appendCount = mode === 'countOnly' || mode === 'dateAndCount';

  const toYMD = (epoch?: number): string | undefined => {
    if (typeof epoch !== 'number') return undefined;
    const dt =
      d.unit === 'ms'
        ? DateTime.fromMillis(epoch, { zone: d.tz })
        : DateTime.fromSeconds(epoch, { zone: d.tz });
    return dt.toISODate() ?? undefined;
  };

  if (appendDates) {
    const from = toYMD(d.clamps?.starts);
    const until = toYMD(d.until);
    if (from) phrase += ` from ${from}`;
    if (until) phrase += ` until ${until}`;
  }

  if (appendCount && typeof d.count === 'number' && d.count > 0) {
    const c = d.count;
    phrase += ` for ${String(c)} occurrence${c === 1 ? '' : 's'}`;
  }
  return phrase;
};
