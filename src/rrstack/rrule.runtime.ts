/**
 * Runtime-safe import shim for 'rrule' to support both ESM and CJS shapes.
 *
 * Some environments/bundlers expose rrule as:
 * - ESM namespace: { RRule, Weekday, Frequency, datetime, ... }
 * - CJS default:   { default: { RRule, Weekday, Frequency, datetime, ... } }
 *
 * This module picks the right object at runtime and re-exports the values
 * used across RRStack. It avoids "Named export not found" and "undefined.Frequency"
 * errors in mixed ESM/CJS downstreams.
 */
import type { datetime,Frequency, RRule, Weekday } from 'rrule';
import * as raw from 'rrule';

type RRuleNS = typeof raw;

function pickRRuleNamespace(mod: unknown): any {
  const m = mod as { default?: unknown };
  const d = m && typeof m === 'object' ? (m as any).default : undefined;
  if (
    d &&
    typeof d === 'object' &&
    (d) &&
    // Heuristic: any of these indicates the rrule surface
    (((d).RRule && (d).Frequency) ||
      (d).datetime ||
      (d).Weekday)
  ) {
    return d as RRuleNS;
  }
  return mod as RRuleNS;
}

const RR: any = pickRRuleNamespace(raw);

// Re-export canonical runtime bindings
export const RRule = RR.RRule as RRuleNS['RRule'];
export const Weekday = RR.Weekday as RRuleNS['Weekday'];
export const Frequency = RR.Frequency as RRuleNS['Frequency'];
export const datetime = RR.datetime as RRuleNS['datetime'];

// Internal: export the picker for unit tests
export const __pickRRuleNamespace = pickRRuleNamespace;
