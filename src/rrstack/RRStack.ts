/**
 * Requirements addressed:
 * - RRStack façade with frozen normalized options (timezone, timeUnit, rules).
 * - Unit-aware compilation and queries; no EPOCH_* usage.
 * - Property-style setters for timezone and rules (validated); timeUnit immutable.
 * - now() helper in configured unit.
 * - Flattened JSON (RRStackJson) with version string (build-injected).
 */

import { IANAZone } from 'luxon';
import { z } from 'zod';

import { type CompiledRule,compileRule } from './compile';
import { ruleCoversInstant } from './coverage';
import { isValidTimeZone } from './coverage/time';
import { classifyRange as sweepClassify,getEffectiveBounds as sweepBounds, getSegments as sweepSegments } from './sweep';
import {
  type RRStackJson,
  type RRStackOptions,
  type RRStackOptionsNormalized,
  type RuleJson,
  type TimeZoneId,
  type UnixTimeUnit,
} from './types';

// Build-time injected in production bundles; fallback for dev/test.
declare const __RRSTACK_VERSION__: string | undefined;

const TimeZoneIdSchema = z
  .string()
  .min(1)
  .refine((tz) => isValidTimeZone(tz), { message: 'Invalid IANA time zone (check ICU data).' })
  .brand<'TimeZoneId'>();

type BrandedTimeZoneId = z.infer<typeof TimeZoneIdSchema>;

const OptionsSchema = z.object({
  timezone: TimeZoneIdSchema,
  timeUnit: z.enum(['ms', 's']).default('ms'),
  rules: z.array(z.any()).default([]),
});

const JsonSchema = OptionsSchema.extend({
  version: z.string().min(1),
});

const RuleLiteSchema = z.object({
  effect: z.enum(['active', 'blackout']),
  duration: z.string().min(1),
  options: z
    .object({
      freq: z.number(),
      starts: z.number().finite().optional(),
      ends: z.number().finite().optional(),
    })
    .passthrough(),
  label: z.string().optional(),
});

export class RRStack {
  public readonly options: RRStackOptionsNormalized;
  private compiled: CompiledRule[] = [];

  constructor(opts: RRStackOptions) {
    const parsed = OptionsSchema.parse({
      timezone: opts.timezone,
      timeUnit: opts.timeUnit ?? 'ms',
      rules: opts.rules ?? [],
    });
    const normalized: RRStackOptionsNormalized = Object.freeze({
      timezone: parsed.timezone as unknown as TimeZoneId,
      timeUnit: parsed.timeUnit,
      rules: Object.freeze([...(parsed.rules as RuleJson[])]),
    });
    this.options = normalized;
    this.recompile();
  }

  private recompile(): void {
    const { timezone, timeUnit, rules } = this.options;
    this.compiled = rules.map((r) => compileRule(r, timezone, timeUnit));
  }

  // Getters / setters (property-style) ---------------------------------------

  get timezone(): string {
    return this.options.timezone as unknown as string;
  }

  set timezone(next: string) {
    const tz = TimeZoneIdSchema.parse(next) as unknown as TimeZoneId;
    const { timeUnit, rules } = this.options;
    // Mutate via replacement; keep options frozen.
    (this as unknown as { options: RRStackOptionsNormalized }).options = Object.freeze({
      timezone: tz,
      timeUnit,
      rules,
    });
    this.recompile();
  }

  get rules(): readonly RuleJson[] {
    return this.options.rules;
  }

  set rules(next: RuleJson[]) {
    // Minimal rule-lite validation to fail fast; full validation in compile.
    next.forEach((r) => RuleLiteSchema.parse(r));
    const { timezone, timeUnit } = this.options;
    const frozen = Object.freeze([...(next)]);
    (this as unknown as { options: RRStackOptionsNormalized }).options = Object.freeze({
      timezone,
      timeUnit,
      rules: frozen,
    });
    this.recompile();
  }

  get timeUnit(): UnixTimeUnit {
    return this.options.timeUnit;
  }

  // Batch update for efficiency
  updateOptions(partial: Pick<RRStackOptions, 'timezone' | 'rules'>): void {
    const tz = partial.timezone !== undefined ? TimeZoneIdSchema.parse(partial.timezone) : this.options.timezone;
    const newRules = partial.rules !== undefined ? Object.freeze([...(partial.rules)]) : this.options.rules;
    (this as unknown as { options: RRStackOptionsNormalized }).options = Object.freeze({
      timezone: tz as unknown as TimeZoneId,
      timeUnit: this.options.timeUnit,
      rules: newRules,
    });
    this.recompile();
  }

  // Helpers -------------------------------------------------------------------

  now(): number {
    return this.options.timeUnit === 'ms' ? Date.now() : Math.floor(Date.now() / 1000);
  }

  // JSON persistence ----------------------------------------------------------

  toJson(): RRStackJson {
    const version = (typeof __RRSTACK_VERSION__ === 'string' && __RRSTACK_VERSION__) || '0.0.0';
    return {
      version,
      timezone: this.options.timezone,
      timeUnit: this.options.timeUnit,
      rules: [...this.options.rules],
    };
  }

  static fromJson(json: RRStackJson): RRStack {
    const parsed = JsonSchema.parse(json);
    return new RRStack({
      timezone: parsed.timezone as unknown as string,
      timeUnit: parsed.timeUnit,
      rules: parsed.rules as RuleJson[],
    });
  }

  // Queries -------------------------------------------------------------------

  isActiveAt(ms: number): instantStatus {
    let status: instantStatus = 'blackout';
    for (let i = 0; i < this.compiled.length; i++) {
      if (ruleCoversInstant(this.compiled[i], ms)) {
        status = this.compiled[i].effect;
      }
    }
    return status;
  }

  getSegments(
    fromMs: number,
    toMs: number,
  ): Iterable<{ start: number; end: number; status: instantStatus }> {
    return sweepSegments(this.compiled, fromMs, toMs);
  }

  classifyRange(fromMs: number, toMs: number): rangeStatus {
    return sweepClassify(this.compiled, fromMs, toMs);
  }

  getEffectiveBounds(): { start?: number; end?: number; empty: boolean } {
    return sweepBounds(this.compiled);
  }
}
