import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { describe, expect, it } from 'vitest';

import { RRSTACK_CONFIG_SCHEMA } from '../index';

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

const getDefs = (
  root: JSONSchema7,
): Record<string, JSONSchema7Definition> | undefined =>
  (root.definitions as Record<string, JSONSchema7Definition> | undefined) ??
  (root as { $defs?: Record<string, JSONSchema7Definition> }).$defs ??
  undefined;

const locateRRRoot = (root: JSONSchema7): JSONSchema7 => {
  // If rules is present at the top-level, use it.
  if (asSchema(root.properties?.rules)) return root;

  // Otherwise, try named definition 'RRStackJson', or scan for a schema with 'rules'.
  const defs = getDefs(root);
  if (defs) {
    const named = asSchema(defs.RRStackJson);
    if (named && asSchema(named.properties?.rules)) return named;

    for (const def of Object.values(defs)) {
      const s = asSchema(def);
      if (s && asSchema(s.properties?.rules)) return s;
    }
  }
  // Fallback to root; subsequent lookups may fail and cause the test to report.
  return root;
};

describe('RRSTACK_CONFIG_SCHEMA export', () => {
  it('exists and exposes OpenAPI-safe duration shape and freq enum', () => {
    const root = RRSTACK_CONFIG_SCHEMA;
    expect(root).toBeTruthy();

    // Prefer definitions.DurationParts (or $defs.DurationParts)
    const defs = getDefs(root);

    let duration: JSONSchema7 | undefined = defs?.DurationParts
      ? asSchema(defs.DurationParts)
      : undefined;

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

    // Fallback to inline under rules.items.properties.duration:
    // resolve items $ref (Rule) first, then duration $ref (DurationParts).
    if (!duration) {
      const rrRoot = locateRRRoot(root);
      const rules = asSchema(rrRoot.properties?.rules);
      const itemsDef = rules?.items;

      // Resolve items (Rule) which may be a ref
      let itemSchema = Array.isArray(itemsDef)
        ? asSchema(itemsDef[0])
        : asSchema(itemsDef);
      if (isRef(itemSchema)) {
        const resolvedItem = followRef(root, itemSchema.$ref);
        if (resolvedItem) itemSchema = resolvedItem;
      }

      const durationDef = (
        itemSchema?.properties as
          | Record<string, JSONSchema7Definition>
          | undefined
      )?.duration;

      let maybeDuration = asSchema(durationDef);
      if (isRef(maybeDuration)) {
        maybeDuration = followRef(root, maybeDuration.$ref);
      }
      duration = maybeDuration;
    }

    // Duration schema present and has the integer fields; no advanced anyOf constraints required.
    expect(duration).toBeTruthy();
    expect(hasDurationProps(duration)).toBe(true);

    // Also verify freq is a string enum with known values
    const rrRoot = locateRRRoot(root);
    const rules = asSchema(rrRoot.properties?.rules);
    let itemSchema = Array.isArray(rules?.items)
      ? asSchema(rules.items[0])
      : asSchema(rules?.items);
    if (isRef(itemSchema)) {
      const resolved = followRef(root, itemSchema.$ref);
      if (resolved) itemSchema = resolved;
    }
    const options = asSchema(
      (
        itemSchema?.properties as
          | Record<string, JSONSchema7Definition>
          | undefined
      )?.options,
    );
    const freq = asSchema(
      (options?.properties as Record<string, JSONSchema7Definition> | undefined)
        ?.freq,
    );
    expect(freq?.type).toBe('string');
    const enumVals = (freq as { enum?: string[] }).enum ?? [];
    expect(enumVals).toContain('daily');
    expect(enumVals).toContain('monthly');
  });
});
