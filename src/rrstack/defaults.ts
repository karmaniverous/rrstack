/**
 * Centralized default values for RRStack.
 * Use these constants instead of duplicating literals across the codebase.
 */
import type { UnixTimeUnit } from './types';

/** Canonical default for time unit across the library. */
export const DEFAULT_TIME_UNIT: UnixTimeUnit = 'ms';

/**
 * Canonical default baseline effect ('auto' means opposite of first rule or 'active' with no rules).
 */
export const DEFAULT_DEFAULT_EFFECT = 'auto' as const;
