import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { describe, expect, it } from 'vitest';

import { RRSTACK_JSON_SCHEMA } from '../index';

const asSchema = (def?: JSONSchema7Definition): JSONSchema7 | undefined => {
  if (!def || typeof def === 'boolean') return undefined;
  return def;
};

const hasDurationProps = (s?: JSONSchema7): boolean => {
  const props = s?.properties as
    | Record<string, JSONSchema7Definition>
    | undefined;
  if (!props) return false;
  const keys = [
    'years',
    'months',
    'weeks',
    'days',
    'hours',
    'minutes',
    'seconds',
  ];
  return keys.every((k) => k in props);
};

const isRef = (s?: JSONSchema7): s is JSONSchema7 & { $ref: string } =>
  !!s && typeof (s as { $ref?: unknown }).$ref === 'string';

const followRef = (root: JSONSchema7, ref: string): JSONSchema7 | undefined => {
  if (!ref.startsWith('#/')) return undefined;
  const segs = ref.slice(2).split('/');
  let cur: unknown = root;
  for (const seg of segs) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  if (typeof cur === 'boolean') return undefined;
  return cur as JSONSchema7;
};

describe('RRSTACK_JSON_SCHEMA export', () => {
  it('exists and includes DurationParts positivity (anyOf)', () => {
    const root = RRSTACK_JSON_SCHEMA;
    expect(root).toBeTruthy();

    // Prefer definitions.DurationParts (or $defs.DurationParts)
    const defs =
      (root.definitions as Record<string, JSONSchema7Definition> | undefined) ??
      (root as unknown as { $defs?: Record<string, JSONSchema7Definition> })
        .$defs ??
      undefined;

    let duration: JSONSchema7 | undefined =
      defs && defs.DurationParts ? asSchema(defs.DurationParts) : undefined;

    // Heuristic scan if the name differs
    if (!duration && defs) {
      for (const def of Object.values(defs)) {
        const s = asSchema(def);
        if (hasDurationProps(s)) {
          duration = s;
          break;
        }
      }
    }

    // Fallback to inline under rules.items.properties.duration (resolve $ref if present)
    if (!duration) {
      const rules = asSchema(root.properties?.rules);
      const itemsDef = rules?.items;
      const item = Array.isArray(itemsDef)
        ? asSchema(itemsDef[0])
        : asSchema(itemsDef);
      const durationDef = (
        item?.properties as Record<string, JSONSchema7Definition> | undefined
      )?.duration;
      let maybeDuration = asSchema(durationDef);
      if (isRef(maybeDuration)) {
        maybeDuration = followRef(root, maybeDuration.$ref);
      }
      duration = maybeDuration;
    }

    expect(duration).toBeTruthy();
    expect(Array.isArray(duration?.anyOf)).toBe(true);
    expect((duration?.anyOf ?? []).length).toBeGreaterThanOrEqual(7);
  });
});
