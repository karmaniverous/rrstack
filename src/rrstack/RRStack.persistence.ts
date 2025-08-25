/**
 * Requirements addressed:
 * - Persistence and version handling separated from core class logic.
 * - toJson writes build-injected version; fromJson parsing centralized.
 */

import { JsonSchema } from './RRStack.options';
import type {
  RRStackJson,
  RRStackOptions,
  RRStackOptionsNormalized,
  RuleJson,
} from './types';

/**
 * Build a JSON snapshot from normalized options.
 */
export const toJsonSnapshot = (
  options: RRStackOptionsNormalized,
  versionMaybe: string | undefined,
): RRStackJson => {
  const version =
    (typeof versionMaybe === 'string' && versionMaybe) || '0.0.0';
  return {
    version,
    timezone: options.timezone,
    timeUnit: options.timeUnit,
    rules: [...options.rules],
  };
};

/**
 * Parse and validate an incoming JSON payload.
 * Returns constructor-friendly options (timezone as plain string).
 */
export const parseJsonPayload = (json: RRStackJson): RRStackOptions => {
  const parsed = JsonSchema.parse(json);
  return {
    timezone: parsed.timezone as unknown as string,
    timeUnit: parsed.timeUnit,
    rules: parsed.rules as RuleJson[],
  };
};
