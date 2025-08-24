/**
 * RRStack — timezone-aware cascade of RRULE-based coverage.
 *
 * RRStack evaluates a prioritized list of rules to answer point queries,
 * enumerate contiguous coverage segments, classify ranges, and compute
 * effective bounds. All computations are performed in the configured IANA
 * timezone with DST-correct duration arithmetic (Luxon).
 *
 * Notes
 * - Options are normalized and frozen on the instance.
 * - `timeUnit` is immutable; change it by constructing a new instance.
 * - Intervals are half-open [start, end). In 's' mode, ends are rounded up to
 *   the next integer second to avoid boundary false negatives.
 *
 * @public
 */
import { z } from 'zod';

import { type CompiledRule, compileRule } from './compile';
import { ruleCoversInstant } from './coverage';
import { isValidTimeZone } from './coverage/time';
import {
  classifyRange as sweepClassify,
  getEffectiveBounds as sweepBounds,
  getSegments as sweepSegments,
} from './sweep';
import {
  type instantStatus,
  type rangeStatus,
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
  .refine((tz) => isValidTimeZone(tz), {
    message: 'Invalid IANA time zone (check ICU data).',
  })
  .brand<'TimeZoneId'>();

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
  /**
   * Normalized, frozen options. Mutate via {@link timezone}, {@link rules},
   * or {@link updateOptions}.
   */
  public readonly options: RRStackOptionsNormalized;

  private compiled: CompiledRule[] = [];

  /**
   * Create a new RRStack.
   *
   * @param opts - Constructor options. `timeUnit` defaults to `'ms'`.
   * @remarks Options are normalized and frozen on the instance. The stack
   *          compiles its rules immediately.
   */
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

  // Convenience helpers -------------------------------------------------------

  /**
   * Validate an IANA timezone id.
   * @param tz - Candidate IANA timezone string.
   * @returns True if recognized by the host ICU/Intl data.
   */
  static isValidTimeZone(tz: string): boolean {
    return isValidTimeZone(tz);
  }

  /**
   * Validate and brand a timezone id.
   * @param tz - Candidate IANA timezone string.
   * @returns The branded {@link TimeZoneId}.
   * @throws If the timezone is invalid in the current environment.
   */
  static asTimeZoneId(tz: string): TimeZoneId {
    if (!isValidTimeZone(tz)) throw new Error(`Invalid IANA time zone: ${tz}`);
    return tz as unknown as TimeZoneId;
  }

  // Getters / setters (property-style) ---------------------------------------

  /**
   * Get the current IANA timezone id (unbranded string).
   */
  get timezone(): string {
    return this.options.timezone as unknown as string;
  }

  /**
   * Set the timezone and recompile.
   * @param next - IANA timezone id (validated).
   * @throws If the timezone is invalid.
   */
  set timezone(next: string) {
    const tz = TimeZoneIdSchema.parse(next) as unknown as TimeZoneId;
    const { timeUnit, rules } = this.options;
    (this as unknown as { options: RRStackOptionsNormalized }).options =
      Object.freeze({
        timezone: tz,
        timeUnit,
        rules,
      });
    this.recompile();
  }

  /**
   * Get the rule list (frozen).
   */
  get rules(): ReadonlyArray<RuleJson> {
    return this.options.rules;
  }

  /**
   * Replace the rule list and recompile.
   * @param next - New rule array. A lightweight runtime check is applied;
   *               full validation occurs during compilation.
   */
  set rules(next: ReadonlyArray<RuleJson>) {
    // Minimal rule-lite validation to fail fast; full validation in compile.
    next.forEach((r) => RuleLiteSchema.parse(r));
    const { timezone, timeUnit } = this.options;
    const frozen = Object.freeze([...(next as RuleJson[])]); // preserve readonly externally
    (this as unknown as { options: RRStackOptionsNormalized }).options =
      Object.freeze({
        timezone,
        timeUnit,
        rules: frozen,
      });
    this.recompile();
  }

  /**
   * Get the configured time unit ('ms' | 's'). Immutable.
   */
  get timeUnit(): UnixTimeUnit {
    return this.options.timeUnit;
  }

  /**
   * Batch update timezone and/or rules in one pass.
   * @param partial - Partial options containing `timezone` and/or `rules`.
   * @remarks Performs one recompile after applying changes.
   */
  updateOptions(
    partial: Partial<Pick<RRStackOptions, 'timezone' | 'rules'>>,
  ): void {
    const tz =
      partial.timezone !== undefined
        ? TimeZoneIdSchema.parse(partial.timezone)
        : this.options.timezone;
    const newRules =
      partial.rules !== undefined
        ? Object.freeze([...partial.rules])
        : this.options.rules;
    (this as unknown as { options: RRStackOptionsNormalized }).options =
      Object.freeze({
        timezone: tz as unknown as TimeZoneId,
        timeUnit: this.options.timeUnit,
        rules: newRules,
      });
    this.recompile();
  }

  // Helpers -------------------------------------------------------------------

  /**
   * Return the current time in the configured unit.
   */
  now(): number {
    return this.options.timeUnit === 'ms'
      ? Date.now()
      : Math.floor(Date.now() / 1000);
  }

  // JSON persistence ----------------------------------------------------------

  /**
   * Serialize the stack to JSON.
   * @returns A {@link RRStackJson} including `version` injected at build time
   *          (fallback `'0.0.0'` in dev/test).
   */
  toJson(): RRStackJson {
    const version =
      (typeof __RRSTACK_VERSION__ === 'string' && __RRSTACK_VERSION__) ||
      '0.0.0';
    return {
      version,
      timezone: this.options.timezone,
      timeUnit: this.options.timeUnit,
      rules: [...this.options.rules],
    };
  }

  /**
   * Construct a stack from a JSON payload.
   * @param json - A {@link RRStackJson} produced by {@link toJson}.
   */
  static fromJson(json: RRStackJson): RRStack {
    const parsed = JsonSchema.parse(json);
    return new RRStack({
      timezone: parsed.timezone as unknown as string,
      timeUnit: parsed.timeUnit,
      rules: parsed.rules as RuleJson[],
    });
  }

  // Queries -------------------------------------------------------------------

  /**
   * Determine whether the stack is active or blackout at `t`.
   * @param t - Timestamp in the configured unit.
   * @returns `'active' | 'blackout'`
   */
  isActiveAt(t: number): instantStatus {
    let status: instantStatus = 'blackout';
    for (let i = 0; i < this.compiled.length; i++) {
      if (ruleCoversInstant(this.compiled[i], t)) {
        status = this.compiled[i].effect;
      }
    }
    return status;
  }

  /**
   * Stream contiguous status segments over `[from, to)`.
   *
   * @param from - Start of the window (inclusive), in the configured unit.
   * @param to - End of the window (exclusive), in the configured unit.
   * @returns An iterable of `{ start, end, status }` entries. Memory-bounded
   *          and stable for long windows.
   *
   * @example
   * for (const seg of stack.getSegments(from, to)) {
   *   // { start: number; end: number; status: 'active' | 'blackout' }
   * }
   */
  getSegments(
    from: number,
    to: number,
  ): Iterable<{ start: number; end: number; status: instantStatus }> {
    return sweepSegments(this.compiled, from, to);
  }

  /**
   * Classify a range `[from, to)` as `'active'`, `'blackout'`, or `'partial'`.
   * @param from - Start of the window (inclusive), in the configured unit.
   * @param to - End of the window (exclusive), in the configured unit.
   */
  classifyRange(from: number, to: number): rangeStatus {
    return sweepClassify(this.compiled, from, to);
  }

  /**
   * Compute effective active bounds across all rules.
   * @returns `{ start?: number; end?: number; empty: boolean }`
   * - `start` and/or `end` are omitted for open-sided coverage.
   * - `empty` indicates no active coverage.
   */
  getEffectiveBounds(): { start?: number; end?: number; empty: boolean } {
    return sweepBounds(this.compiled);
  }
}
