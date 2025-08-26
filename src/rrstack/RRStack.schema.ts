/**
 * Export the persisted JSON Schema as a package-level constant.
 * The JSON is generated at build/docs time by scripts/gen-schema.ts.
 */
import schemaJson from '../../assets/rrstackjson.schema.json';

export const RRSTACK_JSON_SCHEMA = schemaJson as const;
