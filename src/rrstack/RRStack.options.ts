/**
 * Requirements addressed (stan.project.md):
 * - Keep large modules under ~300 LOC by factoring cohesive concerns.
 * - Minimal zod-based validation for options and mutations.
 *
 * This module centralizes RRStack option and JSON schemas, decoupling them
 * from the RRStack class implementation.
 */

import { IANAZone } from 'luxon';
import { z } from 'zod';

import type {
  RRStackOptions,
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
  .refine((tz) => IANAZone.isValidZone(tz), {
    message: 'Invalid IANA time zone (check ICU data).',
  })
  .brand<'TimeZoneId'>();

export const OptionsSchema = z.object({
  // Optional version in the unified input/serialization shape (ignored on input).
  version: z.string().optional(),
  timezone: TimeZoneIdSchema,
  timeUnit: z.enum(['ms', 's']).default('ms'),
  rules: z.array(z.any()).default([]),
});

// String literal-union for RRULE frequency (lower-case human-readable).
const FreqSchema = z.enum([
  'yearly',
  'monthly',
  'weekly',
  'daily',
  'hourly',
  'minutely',
  'secondly',
] as const);

export const RuleLiteSchema = z
  .object({
    effect: z.enum(['active', 'blackout']),
    duration: DurationPartsSchema.optional(),
    options: z
      .object({
        // freq optional; tolerate legacy 'continuous' (normalized later)
        freq: FreqSchema.optional().or(z.literal('continuous').optional()),
        starts: z.number().finite().optional(),
        ends: z.number().finite().optional(),
      })
      .passthrough(),
    label: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const rawFreq = (val as unknown as { options?: { freq?: unknown } })
      ?.options?.freq;
    const isLegacyContinuous = rawFreq === 'continuous';
    const hasFreq =
      typeof rawFreq === 'string' &&
      rawFreq !== '' &&
      rawFreq !== 'continuous';

    if (hasFreq) {
      // Recurring rule must provide a duration.
      if (!val.duration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Recurring rules require a positive duration.',
          path: ['duration'],
        });
      }
    } else {
      // Span rule (no freq or legacy 'continuous') must omit duration.
      if (val.duration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Span rules must omit duration.',
          path: ['duration'],
        });
      }
    }
  });

/**
 * Normalize constructor options using the OptionsSchema.
 */
export const normalizeOptions = (
  opts: RRStackOptions,
): RRStackOptionsNormalized => {
  const parsed = OptionsSchema.parse({
    version: opts.version,
    timezone: opts.timezone,
    timeUnit: opts.timeUnit ?? ('ms' as UnixTimeUnit),
    rules: opts.rules ?? ([] as RuleJson[]),
  });
  // Normalize legacy freq: 'continuous' → undefined
  const rules = ((parsed.rules as RuleJson[]) ?? []).map((r) => {
    const o = { ...(r.options as Record<string, unknown>) };
    if (o && o.freq === 'continuous') {
      delete (o as { freq?: unknown }).freq;
    }
    return { ...r, options: o as unknown } as RuleJson;
  });
  const normalized: RRStackOptionsNormalized = Object.freeze({
    timezone: parsed.timezone as unknown as TimeZoneId,
    timeUnit: parsed.timeUnit,
    rules: Object.freeze([...(rules)]),
  });
  return normalized;
};