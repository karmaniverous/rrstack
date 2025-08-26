import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { describe, expect, it } from 'vitest';

import { RRSTACK_JSON_SCHEMA } from '../index';

const asSchema = (
  def?: JSONSchema7Definition,
): JSONSchema7 | undefined => {
  if (!def || typeof def === 'boolean') return undefined;
  return def;
};

const hasDurationProps = (s?: JSONSchema7): boolean => {
  const props = s?.properties as
    | Record<string, JSONSchema7Definition>
    | undefined;
  if (!props) return false;
  const keys = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];
  return keys.every((k) => k in props);
};

describe('RRSTACK_JSON_SCHEMA export', () => {
  it('exists and includes DurationParts positivity (anyOf)', () => {
    const root = RRSTACK_JSON_SCHEMA;
    expect(root).toBeTruthy();

    // Prefer definitions.DurationParts
    const defs = root.definitions;
    let duration = defs?.DurationParts
      ? asSchema(defs.DurationParts)
      : undefined;

    // Heuristic scan if name differs
    if (!duration && defs) {
      for (const def of Object.values(defs)) {
        const s = asSchema(def);
        if (hasDurationProps(s)) {
          duration = s;
          break;
        }
      }
    }

    // Fallback to inline under rules.items.properties.duration
    if (!duration) {
      const rules = asSchema(root.properties?.rules);
      const itemsDef = rules?.items;
      const item =
        Array.isArray(itemsDef) ? asSchema(itemsDef[0]) : asSchema(itemsDef);
      const durationDef = (item?.properties as
        | Record<string, JSONSchema7Definition>
        | undefined)?.duration;
      duration = asSchema(durationDef);
    }

    expect(duration).toBeTruthy();
    expect(Array.isArray(duration?.anyOf)).toBe(true);
    expect((duration?.anyOf ?? []).length).toBeGreaterThanOrEqual(7);
  });
});