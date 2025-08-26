/**
 * Requirements addressed (stan.project.md):
 * - Keep large modules under ~300 LOC by factoring cohesive concerns.
 * - Minimal zod-based validation for options and mutations.
 *
 * This module centralizes RRStack option and JSON schemas, decoupling them
 * from the RRStack class implementation.
 */

import { Frequency } from 'rrule';
import { z } from 'zod';

import { isValidTimeZone } from './coverage/time';
import type {  RRStackOptions,
  RRStackOptionsNormalized,
  RuleJson,
  TimeZoneId,
  UnixTimeUnit,
} from './types';

// DurationParts validation: non-negative integers, and total > 0.
export const NonNegInt = z.number().int().min(0);

export const DurationPartsSchema = z
  .object({
    years: NonNegInt.optional(),
    months: NonNegInt.optional(),
    weeks: NonNegInt.optional(),
    days: NonNegInt.optional(),
    hours: NonNegInt.optional(),
    minutes: NonNegInt.optional(),
    seconds: NonNegInt.optional(),
  })
  .refine(
    (d) =>
      (d.years ?? 0) +
        (d.months ?? 0) +
        (d.weeks ?? 0) +
        (d.days ?? 0) +
        (d.hours ?? 0) +
        (d.minutes ?? 0) +
        (d.seconds ?? 0) >
      0,
    { message: 'Duration must be strictly positive' },
  );

export const TimeZoneIdSchema = z
  .string()
  .min(1)
  .refine((tz) => isValidTimeZone(tz), {
    message: 'Invalid IANA time zone (check ICU data).',
  })
  .brand<'TimeZoneId'>();

export const OptionsSchema = z.object({
  timezone: TimeZoneIdSchema,
  timeUnit: z.enum(['ms', 's']).default('ms'),
  rules: z.array(z.any()).default([]),
});

export const JsonSchema = OptionsSchema.extend({
  version: z.string().min(1),
});

export const RuleLiteSchema = z.object({
  effect: z.enum(['active', 'blackout']),
  duration: DurationPartsSchema,
  options: z
    .object({
      // Use rrule Frequency enum to emit an enum in JSON Schema.
      freq: z.nativeEnum(Frequency),
      starts: z.number().finite().optional(),
      ends: z.number().finite().optional(),
    })
    .passthrough(),
  label: z.string().optional(),
});

/**
 * Zod schema for the persisted RRStackJson shape (used to generate JSON Schema).
 * - Keeps runtime parse schema (JsonSchema) unchanged to avoid tightening behavior.
 * - Here we strengthen `rules` to RuleLiteSchema for accurate JSON Schema generation.
 */
export const RRStackJsonZod = JsonSchema.extend({
  rules: z.array(RuleLiteSchema),
});

/**
 * Normalize constructor options using the OptionsSchema.
 */
export const normalizeOptions = (
  opts: RRStackOptions,
): RRStackOptionsNormalized => {  const parsed = OptionsSchema.parse({
    timezone: opts.timezone,
    timeUnit: opts.timeUnit ?? ('ms' as UnixTimeUnit),
    rules: opts.rules ?? ([] as RuleJson[]),
  });

  const normalized: RRStackOptionsNormalized = Object.freeze({
    timezone: parsed.timezone as unknown as TimeZoneId,
    timeUnit: parsed.timeUnit,
    rules: Object.freeze([...(parsed.rules as RuleJson[])]),
  });
  return normalized;
};
