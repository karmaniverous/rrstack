/**
 * Export the persisted JSON Schema as a package-level constant.
 * The JSON is generated at build/docs time by scripts/gen-schema.ts.
 *
 * Links
 * - Raw JSON schema (GitHub): https://raw.githubusercontent.com/karmaniverous/rrstack/main/assets/rrstackconfig.schema.json
 * - View in repository: https://github.com/karmaniverous/rrstack/blob/main/assets/rrstackconfig.schema.json
 */
import type { JSONSchema7 } from 'json-schema';

import schemaJson from '../../assets/rrstackconfig.schema.json';

export const RRSTACK_CONFIG_SCHEMA = schemaJson as unknown as JSONSchema7;