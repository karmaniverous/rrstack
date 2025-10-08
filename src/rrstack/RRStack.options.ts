/**
 * Requirements addressed (stan.project.md):
 * - Keep large modules under ~300 LOC by factoring cohesive concerns.
 * - Minimal zod-based validation for options and mutations.
 * - Minimal zod-based validation for options and mutations.
 *
 * This module centralizes RRStack option and JSON schemas, decoupling them * from the RRStack class implementation.
 */

import { IANAZone } from 'luxon';
import { z } from 'zod';

import { DEFAULT_DEFAULT_EFFECT, DEFAULT_TIME_UNIT } from './defaults';
// Runtime accepts rrule Weekday instances (tests and TS callers commonly use them).
import { Weekday } from './rrule.runtime';
import type {
  // types only
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

export const timezoneIdSchema = z
  .string()
  .min(1)
  .refine((tz) => IANAZone.isValidZone(tz), {
    message: 'Invalid IANA time zone (check ICU data).',
  })
  .brand<'TimeZoneId'>();

export const ruleOptionsSchema = z.object({
  // Optional version in the unified input/serialization shape (ignored on input).
  version: z.string().optional(),
  timezone: timezoneIdSchema,
  timeUnit: z.enum(['ms', 's']).default(DEFAULT_TIME_UNIT).optional(),
  defaultEffect: z
    .enum(['active', 'blackout', 'auto'])
    .default(DEFAULT_DEFAULT_EFFECT)
    .optional(),
  rules: z.array(z.any()).default([]).optional(),
});

// String literal-union for RRULE frequency (lower-case human-readable).
const freqSchema = z.enum([
  'yearly',
  'monthly',
  'weekly',
  'daily',
  'hourly',
  'minutely',
  'secondly',
] as const);

// Helper to build a strict options shape, parameterized by the weekday element type.
const weekdayNumber = z.number().int().min(0).max(6);
// Generic over the provided weekday schema to preserve input/output types
// and avoid unknown inference in consumers like RRStackJson.
const makeOptionsShape = <W extends z.ZodType>(weekdayAtom: W) => ({
  // RRStack JSON extras
  freq: freqSchema.optional(),
  starts: z.number().optional(),
  ends: z.number().optional(),
  // RRULE core keys (JSON-friendly)
  interval: z.number().int().positive().optional(),
  wkst: z.number().int().optional(),
  count: z.number().int().positive().optional(),
  bysetpos: z.union([z.array(z.number().int()), z.number().int()]).optional(),
  bymonth: z
    .union([
      z.array(z.number().int().min(1).max(12)),
      z.number().int().min(1).max(12),
    ])
    .optional(),
  bymonthday: z
    .union([
      z.array(
        z
          .number()
          .int()
          .min(-31)
          .max(31)
          .refine((n) => n !== 0),
      ),
      z
        .number()
        .int()
        .min(-31)
        .max(31)
        .refine((n) => n !== 0),
    ])
    .optional(),
  byyearday: z
    .union([
      z.array(
        z
          .number()
          .int()
          .min(-366)
          .max(366)
          .refine((n) => n !== 0),
      ),
      z
        .number()
        .int()
        .min(-366)
        .max(366)
        .refine((n) => n !== 0),
    ])
    .optional(),
  byweekno: z
    .union([
      z.array(
        z
          .number()
          .int()
          .min(-53)
          .max(53)
          .refine((n) => n !== 0),
      ),
      z
        .number()
        .int()
        .min(-53)
        .max(53)
        .refine((n) => n !== 0),
    ])
    .optional(),
  byweekday: z.union([z.array(weekdayAtom), weekdayAtom]).optional(),
  byhour: z
    .union([
      z.array(z.number().int().min(0).max(23)),
      z.number().int().min(0).max(23),
    ])
    .optional(),
  byminute: z
    .union([
      z.array(z.number().int().min(0).max(59)),
      z.number().int().min(0).max(59),
    ])
    .optional(),
  bysecond: z
    .union([
      z.array(z.number().int().min(0).max(59)),
      z.number().int().min(0).max(59),
    ])
    .optional(),
});

/** Strict, enumerated JSON options; weekday is numeric (0..6). */
const RRuleJsonOptionsSchema = z
  .object(makeOptionsShape(weekdayNumber))
  .strict();
/** Strict, enumerated runtime options; weekday may be numeric or rrule Weekday. */
const RRuleRuntimeOptionsSchema = z
  .object(makeOptionsShape(z.union([weekdayNumber, z.instanceof(Weekday)])))
  .strict();

/** JSON rule schema (strict keys; options defaults to empty). */ export const ruleLiteSchemaJson =
  z
    .object({
      effect: z.enum(['active', 'blackout']),
      duration: DurationPartsSchema.optional(),
      options: RRuleJsonOptionsSchema.default({}).optional(),
      label: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      const rawFreq = (val as { options?: { freq?: unknown } }).options?.freq;
      const hasFreq = typeof rawFreq === 'string';
      if (hasFreq) {
        // Recurring rule must provide a duration.
        if (!val.duration) {
          ctx.addIssue({
            code: 'custom',
            message: 'Recurring rules require a positive duration.',
            path: ['duration'],
          });
        }
      } else {
        // Span rule (no freq or legacy 'continuous') must omit duration.
        if (val.duration) {
          ctx.addIssue({
            code: 'custom',
            message: 'Span rules must omit duration.',
            path: ['duration'],
          });
        }
      }
    });

/** Runtime rule schema (strict keys; options defaults to empty). */
export const ruleLiteSchema = z
  .object({
    effect: z.enum(['active', 'blackout']),
    duration: DurationPartsSchema.optional(),
    options: RRuleRuntimeOptionsSchema.default({}).optional(),
    label: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const rawFreq = (val as { options?: { freq?: unknown } }).options?.freq;
    const hasFreq = typeof rawFreq === 'string';
    if (hasFreq) {
      if (!val.duration) {
        ctx.addIssue({
          code: 'custom',
          message: 'Recurring rules require a positive duration.',
          path: ['duration'],
        });
      }
    } else if (val.duration) {
      ctx.addIssue({
        code: 'custom',
        message: 'Span rules must omit duration.',
        path: ['duration'],
      });
    }
  });

/**
 * Unified JSON input schema for RRStack configuration.
 * - rules: optional with default [].
 * - rule options: optional with default empty object when omitted.
 * This is the exact shape accepted by the published JSON Schema.
 */
export const rrstackJsonSchema = ruleOptionsSchema.extend({
  rules: z.array(ruleLiteSchemaJson).default([]).optional(),
});
/**
 * Type that corresponds exactly to the JSON Schema (input side).
 * Use this when typing external JSON payloads.
 */
export type RRStackJson = z.input<typeof rrstackJsonSchema>;

/** Runtime input schema (TS callers/tests; accepts Weekday in byweekday). */
const rrstackRuntimeSchema = ruleOptionsSchema.extend({
  rules: z.array(ruleLiteSchema).default([]).optional(),
});

/**
 * Normalize constructor options using the ruleOptionsSchema.
 */
export const normalizeOptions = (
  opts: RRStackOptions,
): RRStackOptionsNormalized => {
  const parsed = rrstackRuntimeSchema.parse({
    version: opts.version,
    timezone: opts.timezone,
    timeUnit: opts.timeUnit,
    defaultEffect: opts.defaultEffect,
    rules: opts.rules,
  });

  // Coalesce defaulted optionals to concrete values for normalized shape.
  const unit: UnixTimeUnit = parsed.timeUnit ?? DEFAULT_TIME_UNIT;
  const de = parsed.defaultEffect ?? DEFAULT_DEFAULT_EFFECT;
  // Validate and coerce rules to RuleJson to avoid unsafe spreads of any[].
  const rawRules = (parsed.rules ?? []) as unknown[];
  const rulesArr: readonly RuleJson[] = Object.freeze(
    rawRules.map((r) => {
      // Reuse the lightweight rule schema; full validation still occurs during compilation.
      // ruleLiteSchema supplies defaults (options empty when omitted).
      return ruleLiteSchema.parse(r) as RuleJson;
    }),
  );

  const normalized: RRStackOptionsNormalized = Object.freeze({
    timezone: parsed.timezone as unknown as TimeZoneId,
    timeUnit: unit,
    defaultEffect: de,
    rules: rulesArr,
  });
  return normalized;
};
