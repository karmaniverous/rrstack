/**
 * Generate the package JSON Schema from the Zod source of truth.
 * - Uses zod-to-json-schema at build/docs time (dev-only dependency).
 * - Post-processes DurationParts to require at least one non-zero component
 *   via an `anyOf` of required+minimum(1) constraints.
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

async function main(): Promise<void> {
  // 1) Generate base schema (draft-07).
  const schema = zodToJsonSchema(RRStackJsonZod, {
    name: 'RRStackJson',
    target: 'jsonSchema7',
  }) as JSONSchema7;

  // 2) Locate DurationParts and enforce positivity via anyOf.
  let durationTarget: JSONSchema7 | undefined;

  // Preferred path: properties.rules.items.properties.duration
  const rulesSchema = asSchema(schema.properties?.rules);

  let itemSchema: JSONSchema7 | undefined;
  const itemsDef = rulesSchema?.items;
  if (Array.isArray(itemsDef)) {
    itemSchema = asSchema(itemsDef[0]);
  } else {
    itemSchema = asSchema(itemsDef);
  }

  if (itemSchema) {
    const itemProps = itemSchema.properties as
      | Record<string, JSONSchema7Definition>
      | undefined;

    const durationDef = itemProps?.duration;
    const maybeDuration = asSchema(durationDef);

    if (maybeDuration?.$ref) {
      durationTarget = followRef(schema, maybeDuration.$ref);
    } else if (maybeDuration) {
      durationTarget = maybeDuration;
    } else if (itemSchema.$ref) {
      const resolvedItem = followRef(schema, itemSchema.$ref);
      const resolvedProps = resolvedItem?.properties as
        | Record<string, JSONSchema7Definition>
        | undefined;
      const resolvedDuration = asSchema(resolvedProps?.duration);
      if (resolvedDuration?.$ref) {
        durationTarget = followRef(schema, resolvedDuration.$ref);
      } else {
        durationTarget = resolvedDuration;
      }
    }
  }

  // Fallback: scan definitions for a schema that looks like DurationParts.
  if (!durationTarget && schema.definitions) {
    for (const def of Object.values(schema.definitions)) {
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

  if (durationTarget) {
    addAnyOfMinOne(durationTarget);
  }

  // 3) Write artifact.
  const outDir = path.resolve(__dirname, '../assets');
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'rrstackjson.schema.json');
  const text = JSON.stringify(schema, null, 2) + '\n';
  await writeFile(outFile, text, 'utf8');
}

void main();
