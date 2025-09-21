/**
 * Runtime-safe import shim for 'rrule' to support both ESM and CJS shapes.
 *
 * Some environments/bundlers expose rrule as:
 * - ESM namespace: RRule/Weekday/Frequency/datetime as named exports.
 * - CJS default: a default export object containing those same keys.
 *
 * This module picks the right object at runtime and re-exports the values
 * used across RRStack. It avoids "Named export not found" and
 * "undefined.Frequency" errors in mixed ESM/CJS downstreams.
 */
import * as raw from 'rrule';

type RRuleNS = typeof raw;

/**
 * Pick the rrule namespace. If the module exposes a default object (CJS),
 * prefer it; otherwise use the namespace itself (ESM).
 */
function pickRRuleNamespace(mod: unknown): RRuleNS {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    const d = (mod as { default: unknown }).default;
    if (d && typeof d === 'object') {
      return d as RRuleNS;
    }
  }
  return mod as RRuleNS;
}

const RR = pickRRuleNamespace(raw);

// Re-export canonical runtime bindings
export const RRule = RR.RRule;
export const Weekday = RR.Weekday;
export const Frequency = RR.Frequency;
export const datetime = RR.datetime;

// Internal: export the picker for unit tests
export const __pickRRuleNamespace = pickRRuleNamespace;
