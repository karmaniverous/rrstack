/**
 * Generate the package JSON Schema from the Zod source of truth.
 * - Uses Zod v4 native JSON Schema conversion at build/docs time.
 * - OpenAPI-safe: do not inject advanced conditional/positivity constraints;
 *   these are enforced at runtime by Zod.
 * - Post-process Rule.options.freq to ensure a string enum of lower‑case
 *   human‑readable values ('yearly'..'secondly').
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { z } from 'zod';

import { rrstackJsonSchema } from '../src/rrstack/RRStack.options';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  if (itemSchema?.$ref && typeof itemSchema.$ref === 'string') {
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
  if (optionsSchema?.$ref && typeof optionsSchema.$ref === 'string') {
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

  // Remove any wrapper so only the string enum remains.
  delete (freq as { anyOf?: unknown }).anyOf;

  freq.type = 'string';
  (freq as { enum?: readonly string[] }).enum = [...FREQ_VALUES];
};

async function main(): Promise<void> {
  // Use the centralized JSON input schema for generation.
  const RRStackOptionsZod = rrstackJsonSchema;

  type ZodWithToJSON = typeof z & {
    toJSONSchema: (
      schema: unknown,
      name?: string,
      options?: {
        $refStrategy?: 'none' | 'root' | 'path';
        [k: string]: unknown;
      },
    ) => unknown;
  };
  const Z = z as ZodWithToJSON;
  const schema = Z.toJSONSchema(RRStackOptionsZod, 'RRStackOptions', {
    $refStrategy: 'none',
  }) as JSONSchema7;

  // 2) Enforce freq string enum on Rule.options.freq.
  ensureFreqStringEnum(schema);

  // 3) Write artifact.
  const outDir = path.resolve(__dirname, '../assets');
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'rrstackconfig.schema.json');
  const text = JSON.stringify(schema, null, 2) + '\n';
  await writeFile(outFile, text, 'utf8');
}

void main();
