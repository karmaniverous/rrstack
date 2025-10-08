import { DateTime } from 'luxon';

import type { DescribeConfig } from '../../config';
import type { RuleDescriptor } from '../../descriptor';
import { buildCadence } from './cadence';
import { durationToTextFromParts } from './helpers';

export type DescribeTranslator = (
  desc: RuleDescriptor,
  cfg?: DescribeConfig,
) => string;

const formatBound = (
  epoch: number | undefined,
  tz: string,
  unit: 'ms' | 's',
  format?: string,
): string | undefined => {
  if (typeof epoch !== 'number') return undefined;
  const dt =
    unit === 'ms'
      ? DateTime.fromMillis(epoch, { zone: tz })
      : DateTime.fromSeconds(epoch, { zone: tz });
  return format
    ? dt.toFormat(format)
    : (dt.toISO({ suppressMilliseconds: true }) ?? undefined);
};

/**
 * Strict English translator (modular). Renders the whole sentence:
 * - Effect + duration
 * - Cadence (daily/weekly/monthly/yearly)
 * - Optional timezone label
 * - Optional inline bounds ("from … until …")
 */
export const strictEnTranslator: DescribeTranslator = (
  desc,
  cfg = {},
): string => {
  if (desc.kind === 'span') {
    let s = `${desc.effect === 'active' ? 'Active' : 'Blackout'} continuously`;
    if (cfg.showTimezone) {
      const label = cfg.formatTimezoneLabel
        ? cfg.formatTimezoneLabel(desc.tz)
        : desc.tz;
      s += ` (timezone ${label})`;
    }
    if (cfg.showBounds) {
      const from = formatBound(
        desc.clamps?.starts,
        desc.tz,
        desc.unit,
        cfg.boundsFormat,
      );
      const until = formatBound(
        desc.clamps?.ends,
        desc.tz,
        desc.unit,
        cfg.boundsFormat,
      );
      if (from) s += ` from ${from}`;
      if (until) s += ` until ${until}`;
    }
    return s;
  }

  // Recurring rule
  const effect = desc.effect === 'active' ? 'Active' : 'Blackout';
  const durText = durationToTextFromParts(desc.duration);
  const cadence = buildCadence(desc, cfg);
  let s = `${effect} for ${durText} ${cadence}`;

  if (cfg.showTimezone) {
    const label = cfg.formatTimezoneLabel
      ? cfg.formatTimezoneLabel(desc.tz)
      : desc.tz;
    s += ` (timezone ${label})`;
  }

  if (cfg.showBounds) {
    const from = formatBound(
      desc.clamps?.starts,
      desc.tz,
      desc.unit,
      cfg.boundsFormat,
    );
    const until = formatBound(
      desc.clamps?.ends,
      desc.tz,
      desc.unit,
      cfg.boundsFormat,
    );
    if (from) s += ` from ${from}`;
    if (until) s += ` until ${until}`;
  }
  return s;
};
