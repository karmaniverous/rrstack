/**
 * Export the persisted JSON Schema as a package-level constant.
 * The JSON is generated at build/docs time by scripts/gen-schema.ts.
 */
import type { JSONSchema7 } from 'json-schema';

import schemaJson from '../../assets/rrstackjson.schema.json';

export const RRSTACK_JSON_SCHEMA = schemaJson as JSONSchema7;