/**
 * Generate the package JSON Schema from the Zod source of truth.
 * - Uses zod-to-json-schema at build/docs time (dev-only dependency).
 * - Post-processes DurationParts to require at least one non-zero component
 *   via an `anyOf` of required+minimum(1) constraints.
 */

import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { zodToJsonSchema } from 'zod-to-json-schema';

import { RRStackJsonZod } from '../src/rrstack/RRStack.options';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type JsonLike = Record<string, unknown>;

const durationKeys = [
  'years',
  'months',
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
] as const;

function get(obj: unknown, pathSegs: string[]): any {
  let cur: any = obj;
  for (const seg of pathSegs) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function set(obj: unknown, pathSegs: string[], value: unknown): void {
  let cur: any = obj;
  for (let i = 0; i < pathSegs.length - 1; i++) {
    const seg = pathSegs[i];
    const next = cur[seg];
    if (!next || typeof next !== 'object') cur[seg] = {};
    cur = cur[seg];
  }
  cur[pathSegs[pathSegs.length - 1]] = value;
}

function followRef(root: JsonLike, ref: string): { node: JsonLike; path: string[] } | null {
  if (!ref.startsWith('#/')) return null;
  const segs = ref.slice(2).split('/');
  const node = get(root, segs);
  if (!node || typeof node !== 'object') return null;
  return { node, path: segs };
}

function addAnyOfMinOne(durationNode: JsonLike): void {
  const existingAnyOf = Array.isArray((durationNode as any).anyOf)
    ? ((durationNode as any).anyOf as unknown[])
    : [];
  const positivityAnyOf = durationKeys.map((k) => ({
    required: [k],
    properties: { [k]: { type: 'integer', minimum: 1 } },
  }));
  (durationNode as any).anyOf = [...existingAnyOf, ...positivityAnyOf];
}

async function main(): Promise<void> {
  // 1) Generate base schema (draft-07).
  const schema = zodToJsonSchema(RRStackJsonZod, {
    name: 'RRStackJson',
    target: 'jsonSchema7',
  }) as JsonLike;

  // 2) Locate DurationParts node (either via $ref or inline), then post-process.
  // Preferred path: properties.rules.items.properties.duration
  let durationNode: JsonLike | undefined;
  let durationPath: string[] | undefined;

  const rulesNode = get(schema, ['properties', 'rules']) ?? get(schema, ['definitions', 'RRStackJson', 'properties', 'rules']);
  const itemsNode = rulesNode && (rulesNode).items;

  // Handle common shapes: items may be a ref or an object schema
  let ruleItemSchema: any = itemsNode;
  if (ruleItemSchema && typeof ruleItemSchema === 'object' && typeof ruleItemSchema.$ref === 'string') {
    const r = followRef(schema, ruleItemSchema.$ref);
    if (r) ruleItemSchema = r.node;
  }

  if (ruleItemSchema && typeof ruleItemSchema === 'object') {
    let durationField = ruleItemSchema.properties?.duration;
    if (!durationField && typeof ruleItemSchema.$ref === 'string') {
      const r = followRef(schema, ruleItemSchema.$ref);
      if (r?.node && typeof r.node === 'object') {
        durationField = (r.node as any).properties?.duration;
      }
    }

    if (durationField && typeof durationField === 'object') {
      if (typeof durationField.$ref === 'string') {
        const ref = followRef(schema, durationField.$ref);
        if (ref) {
          durationNode = ref.node;
          durationPath = ref.path;
        }
      } else {
        durationNode = durationField as JsonLike;
        durationPath = ['properties', 'rules', 'items', 'properties', 'duration'];
      }
    }
  }

  // Fallback: scan definitions for the object with the DurationParts shape
  if (!durationNode) {
    const defs = (schema as any).definitions;
    if (defs && typeof defs === 'object') {
      for (const [k, v] of Object.entries(defs as Record<string, any>)) {
        const props = v?.properties;
        if (
          props &&
          typeof props === 'object' &&
          durationKeys.every((d) => d in props)
        ) {
          durationNode = v as JsonLike;
          durationPath = ['definitions', k];
          break;
        }
      }
    }
  }

  if (durationNode && durationPath) {
    addAnyOfMinOne(durationNode);
    // write back only needed if we followed $ref into a copy; here we mutate in place,
    // but keep for completeness.
    set(schema, durationPath, durationNode);
  } else {
    // Best-effort; still emit schema without the cross-field constraint if not found
    // (should not happen for current shapes).
  }

  // 3) Write artifact.
  const outDir = path.resolve(__dirname, '../assets');
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'rrstackjson.schema.json');
  const text = JSON.stringify(schema, null, 2) + '\n';
  await writeFile(outFile, text, 'utf8');
}

void main();
