/**
 * Generate the package JSON Schema from the Zod source of truth.
 * - Uses zod-to-json-schema at build/docs time (dev-only dependency).
 * - Post-processes DurationParts to require at least one non-zero component
 *   via an `anyOf` of required+minimum(1) constraints.
 * - Post-processes Rule.options.freq to ensure a string enum of lower-case
 *   human-readable values ('yearly'..'secondly').
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { RRStackJsonZod } from '../src/rrstack/RRStack.options';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const durationKeys = [
  'years',
  'months',
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
] as const;

const FREQ_VALUES = [
  'yearly',
  'monthly',
  'weekly',
  'daily',
  'hourly',
  'minutely',
  'secondly',
] as const;

const isObjectRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const asSchema = (
  def: JSONSchema7Definition | undefined,
): JSONSchema7 | undefined => {
  if (!def || typeof def === 'boolean') return undefined;
  return def;
};

const followRef = (root: JSONSchema7, ref: string): JSONSchema7 | undefined => {
  if (!ref.startsWith('#/')) return undefined;
  const segs = ref.slice(2).split('/');
  let cur: unknown = root;
  for (const seg of segs) {
    if (!isObjectRecord(cur)) return undefined;
    cur = cur[seg];
  }
  if (typeof cur === 'boolean') return undefined;
  return cur as JSONSchema7;
};

const addAnyOfMinOne = (target: JSONSchema7): void => {
  const existing = Array.isArray(target.anyOf) ? target.anyOf : [];
  const positivity = durationKeys.map(
    (k): JSONSchema7 =>
      ({
        required: [k],
        properties: {
          [k]: { type: 'integer', minimum: 1 },
        } as Record<string, JSONSchema7Definition>,
      }) satisfies JSONSchema7,
  );
  target.anyOf = [...existing, ...positivity];
};

const getDefs = (
  root: JSONSchema7,
): Record<string, JSONSchema7Definition> | undefined =>
  (root.definitions as Record<string, JSONSchema7Definition> | undefined) ??
  (root as unknown as { $defs?: Record<string, JSONSchema7Definition> })
    .$defs ??
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
  // Fallback to root; subsequent lookups may fail and cause the generator to skip inline path.
  return root;
};

const ensureFreqStringEnum = (root: JSONSchema7): void => {
  const rrRoot = locateRRRoot(root);
  const rulesSchema = asSchema(rrRoot.properties?.rules);
  if (!rulesSchema) return;

  // Resolve rules.items → Rule schema
  let itemSchema: JSONSchema7 | undefined;
  const itemsDef = rulesSchema.items;
  itemSchema = Array.isArray(itemsDef)
    ? asSchema(itemsDef[0])
    : asSchema(itemsDef);
  if (itemSchema && itemSchema.$ref && typeof itemSchema.$ref === 'string') {
    const resolved = followRef(root, itemSchema.$ref);
    if (resolved) itemSchema = resolved;
  }
  if (!itemSchema) return;

  // Resolve Rule.options (may be inline or a ref)
  const ruleProps = itemSchema.properties as
    | Record<string, JSONSchema7Definition>
    | undefined;
  if (!ruleProps) return;

  let optionsSchema = asSchema(ruleProps.options);
  if (
    optionsSchema &&
    optionsSchema.$ref &&
    typeof optionsSchema.$ref === 'string'
  ) {
    const resolved = followRef(root, optionsSchema.$ref);
    if (resolved) optionsSchema = resolved;
  }
  if (!optionsSchema) return;

  // Enforce freq string enum
  const optProps = optionsSchema.properties as
    | Record<string, JSONSchema7Definition>
    | undefined;
  if (!optProps) return;

  const freq = asSchema(optProps.freq);
  if (!freq) return;

  freq.type = 'string';
  (freq as unknown as { enum?: readonly string[] }).enum = [...FREQ_VALUES];
};

async function main(): Promise<void> {
  // 1) Generate base schema (draft-07).
  const schema = zodToJsonSchema(RRStackJsonZod, {
    name: 'RRStackJson',
    target: 'jsonSchema7',
  }) as JSONSchema7;

  // 2) Locate DurationParts and enforce positivity via anyOf.
  let durationTarget: JSONSchema7 | undefined;

  // Preferred path: rrRoot.properties.rules.items.properties.duration
  const rrRoot = locateRRRoot(schema);
  const rulesSchema = asSchema(rrRoot.properties?.rules);

  let itemSchema: JSONSchema7 | undefined;
  const itemsDef = rulesSchema?.items;
  if (Array.isArray(itemsDef)) {
    itemSchema = asSchema(itemsDef[0]);
  } else {
    itemSchema = asSchema(itemsDef);
  }

  if (itemSchema) {
    // Resolve items (Rule) which may be a ref
    if (itemSchema.$ref && typeof itemSchema.$ref === 'string') {
      const resolved = followRef(schema, itemSchema.$ref);
      if (resolved) itemSchema = resolved;
    }

    const itemProps = itemSchema.properties as
      | Record<string, JSONSchema7Definition>
      | undefined;

    const durationDef = itemProps?.duration;
    const maybeDuration = asSchema(durationDef);

    if (maybeDuration?.$ref && typeof maybeDuration.$ref === 'string') {
      durationTarget = followRef(schema, maybeDuration.$ref);
    } else if (maybeDuration) {
      durationTarget = maybeDuration;
    }
  }

  // Fallback: scan both definitions and $defs for a schema that looks like DurationParts.
  if (!durationTarget) {
    const defs = getDefs(schema);
    if (defs) {
      for (const def of Object.values(defs)) {
        const s = asSchema(def);
        if (!s) continue;
        const props = s.properties as
          | Record<string, JSONSchema7Definition>
          | undefined;
        if (!props) continue;
        const hasAll = durationKeys.every((k) => k in props);
        if (hasAll) {
          durationTarget = s;
          break;
        }
      }
    }
  }

  if (durationTarget) {
    addAnyOfMinOne(durationTarget);
  }

  // 3) Enforce freq string enum on Rule.options.freq.
  ensureFreqStringEnum(schema);

  // 4) Write artifact.
  const outDir = path.resolve(__dirname, '../assets');
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'rrstackjson.schema.json');
  const text = JSON.stringify(schema, null, 2) + '\n';
  await writeFile(outFile, text, 'utf8');
}

void main();
