/**
 * Requirements addressed:
 * - Persistence and version handling separated from core class logic.
 * - toJson writes build-injected version.
 */

import type { RRStackOptions, RRStackOptionsNormalized } from './types';

/**
 * Build a JSON snapshot from normalized options.
 */
export const toJsonSnapshot = (
  options: RRStackOptionsNormalized,
  versionMaybe: string | undefined,
): RRStackOptions => {
  const version = (typeof versionMaybe === 'string' && versionMaybe) || '0.0.0';
  return {
    version,
    timezone: options.timezone as string,
    timeUnit: options.timeUnit,
    defaultEffect: options.defaultEffect,
    rules: [...options.rules],
  };
};
