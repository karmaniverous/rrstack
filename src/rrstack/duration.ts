/**
 * Duration helpers for UI interop and debugging.
 *
 * Policy
 * - All units are non-negative integers (no fractional values).
 * - Total duration must be \> 0.
 * - ISO "weeks" form (PnW) cannot be mixed with other date/time fields.
 *   • toIsoDuration will normalize mixed \{ weeks, ... \} by converting weeks → days.
 *   • fromIsoDuration accepts either PnW (weeks-only) or the standard Y/M/D + T H/M/S form.
 */

import type { DurationParts } from './types';

/** @internal */
const isNonNegInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0;

/**
 * Convert structured {@link DurationParts} to an ISO-8601 duration string.
 * - Integer-only components.
 * - If weeks are present alongside any other component, they are converted to days (weeks * 7).
 * - Emits either PnW (weeks-only) or standard PnYnMnDTnHnMnS.
 *
 * @throws If all components are zero or any component is invalid.
 */
export const toIsoDuration = (parts: DurationParts): string => {
  const y = parts.years ?? 0;
  const mo = parts.months ?? 0;
  const w = parts.weeks ?? 0;
  const d = parts.days ?? 0;
  const h = parts.hours ?? 0;
  const mi = parts.minutes ?? 0;
  const s = parts.seconds ?? 0;

  const all = [y, mo, w, d, h, mi, s];
  if (!all.every(isNonNegInt)) {
    throw new Error('DurationParts must be non-negative integers.');
  }
  const total = y + mo + w + d + h + mi + s;
  if (total <= 0) {
    throw new Error('Duration must be strictly positive.');
  }

  // Decide whether weeks-only form is valid
  const hasWeeks = w > 0;
  const hasOther = y > 0 || mo > 0 || d > 0 || h > 0 || mi > 0 || s > 0;

  if (hasWeeks && !hasOther) {
    return 'P' + String(w) + 'W';
  }

  // Normalize weeks into days if anything else is present
  const days = d + w * 7;

  const datePartsTokens: string[] = [];
  if (y) datePartsTokens.push(String(y) + 'Y');
  if (mo) datePartsTokens.push(String(mo) + 'M');
  if (days) datePartsTokens.push(String(days) + 'D');
  const dateParts = datePartsTokens.join('');

  const timePartsTokens: string[] = [];
  if (h) timePartsTokens.push(String(h) + 'H');
  if (mi) timePartsTokens.push(String(mi) + 'M');
  if (s) timePartsTokens.push(String(s) + 'S');
  const timeParts = timePartsTokens.join('');

  if (!dateParts && !timeParts) {
    // Shouldn't happen due to total > 0, but guard anyway
    throw new Error('Duration must include at least one component.');
  }

  return 'P' + dateParts + (timeParts ? 'T' + timeParts : '');
};

/**
 * Parse an ISO-8601 duration string into {@link DurationParts}.
 * - Supports either PnW (weeks-only) or the standard PnYnMnDTnHnMnS form.
 * - Integer-only components (no fractional values); throws on decimals.
 * - Rejects invalid mixes (e.g., weeks together with other fields).
 *
 * @throws If the string is invalid, mixed weeks with other units, uses decimals,
 *         or totals to zero.
 */
export const fromIsoDuration = (isoRaw: string): DurationParts => {
  if (typeof isoRaw !== 'string') {
    throw new Error('ISO duration must be a string.');
  }
  const iso = isoRaw.trim().toUpperCase();

  // Weeks-only: PnW
  const wk = /^P(?<weeks>\d+)W$/.exec(iso);
  if (wk?.groups) {
    const weeks = Number(wk.groups.weeks);
    if (!Number.isInteger(weeks) || weeks <= 0) {
      throw new Error('Weeks must be a positive integer.');
    }
    return { weeks };
  }

  // Standard form: PnYnMnDTnHnMnS (integers only)
  // Note: "M" appears in date (months) and time (minutes); separated groups handle this.
  const re =
    /^P(?:(?<years>\d+)Y)?(?:(?<months>\d+)M)?(?:(?<days>\d+)D)?(?:T(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?)?$/;
  const m = re.exec(iso);
  if (!m?.groups) {
    throw new Error(
      'Invalid ISO duration. Use PnW (weeks-only) or PnYnMnDTnHnMnS (integers only).',
    );
  }

  // Treat named groups as possibly undefined to satisfy strict linting.
  const g = m.groups as Record<string, string | undefined>;

  const years = Number(g.years ?? '0');
  const months = Number(g.months ?? '0');
  const days = Number(g.days ?? '0');
  const hours = Number(g.hours ?? '0');
  const minutes = Number(g.minutes ?? '0');
  const seconds = Number(g.seconds ?? '0');

  const all = [years, months, days, hours, minutes, seconds];
  if (!all.every(isNonNegInt)) {
    throw new Error('ISO duration must use integer components (no decimals).');
  }
  const total = all.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    throw new Error('Duration must be strictly positive.');
  }

  return {
    years: years || undefined,
    months: months || undefined,
    days: days || undefined,
    hours: hours || undefined,
    minutes: minutes || undefined,
    seconds: seconds || undefined,
  };
};
