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

import { type CompiledRule, compileRule } from './compile';
import { isValidTimeZone } from './coverage/time';
import { describeCompiledRule, type DescribeOptions } from './describe';
import {
  normalizeOptions,
  RuleLiteSchema,
  TimeZoneIdSchema,
} from './RRStack.options';
import { toJsonSnapshot } from './RRStack.persistence';
import {
  classifyRangeOverWindow,
  getEffectiveBoundsFromCompiled,
  getSegmentsOverWindow,
  isActiveAtCompiled,
} from './RRStack.queries';
import {
  type instantStatus,
  type rangeStatus,  type RRStackOptions,
  type RRStackOptionsNormalized,
  type RuleJson,
  type TimeZoneId,
  type UnixTimeUnit,
} from './types';

// Build-time injected in production bundles; fallback for dev/test.
declare const __RRSTACK_VERSION__: string | undefined;

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
   *          compiles its rules immediately. The optional `version` is ignored.
   */
  constructor(opts: RRStackOptions) {
    const normalized = normalizeOptions(opts);
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
   * @returns A {@link RRStackOptions} including `version` injected at build time
   *          (fallback `'0.0.0'` in dev/test).
   */
  toJson(): RRStackOptions {
    const v =
      (typeof __RRSTACK_VERSION__ === 'string' && __RRSTACK_VERSION__) ||
      undefined;
    return toJsonSnapshot(this.options, v);
  }

  // Queries -------------------------------------------------------------------

  /**
   * Determine whether the stack is active at `t`.
   * @param t - Timestamp in the configured unit.
   * @returns true when active; false when blackout.
   */
  isActiveAt(t: number): boolean {
    return isActiveAtCompiled(this.compiled, t);
  }

  /**
   * Stream contiguous status segments over `[from, to)`.   *
   * @param from - Start of the window (inclusive), in the configured unit.
   * @param to - End of the window (exclusive), in the configured unit.
   * @param opts - Optional settings:
   *   - limit?: number — maximum number of segments to yield; throws
   *     if more would be produced (no silent truncation).
   * @returns An iterable of `{ start, end, status }` entries. Memory-bounded
   *          and stable for long windows.
   *
   * @example
   * ```ts
   * for (const seg of stack.getSegments(from, to)) {
   *   // { start: number; end: number; status: 'active' | 'blackout' }
   * }
   * ```
   */
  getSegments(
    from: number,
    to: number,
    opts?: { limit?: number },
  ): Iterable<{ start: number; end: number; status: instantStatus }> {
    return getSegmentsOverWindow(this.compiled, from, to, opts);
  }
  /**
   * Classify a range `[from, to)` as `'active'`, `'blackout'`, or `'partial'`.
   * @param from - Start of the window (inclusive), in the configured unit.
   * @param to - End of the window (exclusive), in the configured unit.
   */
  classifyRange(from: number, to: number): rangeStatus {
    return classifyRangeOverWindow(this.compiled, from, to);
  }

  /**
   * Compute effective active bounds across all rules.
   * @returns `{ start?: number; end?: number; empty: boolean }`
   * - `start` and/or `end` are omitted for open-sided coverage.
   * - `empty` indicates no active coverage.
   */
  getEffectiveBounds(): { start?: number; end?: number; empty: boolean } {
    return getEffectiveBoundsFromCompiled(this.compiled);
  }

  /**
   * Describe a rule by index as human-readable text.
   * Leverages rrule.toText() plus effect and duration phrasing.
   *
   * @param index - Zero-based index into {@link rules}.
   * @param opts - Description options (timezone/bounds toggles).
   * @throws RangeError if index is out of bounds; TypeError if not an integer.
   */
  describeRule(index: number, opts: DescribeOptions = {}): string {
    if (!Number.isInteger(index)) {
      throw new TypeError('rule index must be an integer');
    }
    if (index < 0 || index >= this.compiled.length) throw new RangeError('rule index out of range');
    return describeCompiledRule(this.compiled[index], opts);
  }

  // Convenience rule mutators -------------------------------------------------

  /**
   * Insert a rule at a specific index (or append when index is omitted).
   * Delegates to the {@link rules} setter (single recompile).
   */
  addRule(rule: RuleJson, index?: number): void {
    // Lightweight validation
    RuleLiteSchema.parse(rule);
    const next = [...(this.options.rules as RuleJson[])];
    if (index === undefined) {
      next.push(rule);
    } else {
      if (!Number.isInteger(index)) throw new TypeError('index must be an integer');
      if (index < 0 || index > next.length) throw new RangeError('index out of range');
      next.splice(index, 0, rule);
    }
    this.rules = next;
  }

  /**
   * Swap two rules by index (no-op if indices are equal).
   */
  swap(i: number, j: number): void {
    if (!Number.isInteger(i) || !Number.isInteger(j)) {
      throw new TypeError('indices must be integers');
    }
    const n = this.options.rules.length;
    if (i < 0 || i >= n || j < 0 || j >= n) throw new RangeError('index out of range');
    if (i === j) return;
    const next = [...(this.options.rules as RuleJson[])];
    [next[i], next[j]] = [next[j], next[i]];
    this.rules = next;
  }

  /**
   * Move a rule up by one (toward index 0). No-op if already at the top.
   */
  up(i: number): void {
    if (!Number.isInteger(i)) throw new TypeError('index must be an integer');
    const n = this.options.rules.length;
    if (i < 0 || i >= n) throw new RangeError('index out of range');
    if (i === 0) return;
    const next = [...(this.options.rules as RuleJson[])];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    this.rules = next;
  }

  /**
   * Move a rule down by one (toward the end). No-op if already at the bottom.
   */
  down(i: number): void {
    if (!Number.isInteger(i)) throw new TypeError('index must be an integer');
    const n = this.options.rules.length;
    if (i < 0 || i >= n) throw new RangeError('index out of range');
    if (i === n - 1) return;
    const next = [...(this.options.rules as RuleJson[])];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    this.rules = next;
  }

  /**
   * Move a rule to the top (index 0).
   */
  top(i: number): void {
    if (!Number.isInteger(i)) throw new TypeError('index must be an integer');
    const n = this.options.rules.length;
    if (i < 0 || i >= n) throw new RangeError('index out of range');
    if (i === 0) return;
    const next = [...(this.options.rules as RuleJson[])];
    const [r] = next.splice(i, 1);
    next.unshift(r);
    this.rules = next;
  }

  /**
   * Move a rule to the bottom (last index).
   */
  bottom(i: number): void {
    if (!Number.isInteger(i)) throw new TypeError('index must be an integer');
    const n = this.options.rules.length;
    if (i < 0 || i >= n) throw new RangeError('index out of range');
    if (i === n - 1) return;
    const next = [...(this.options.rules as RuleJson[])];
    const [r] = next.splice(i, 1);
    next.push(r);
    this.rules = next;
  }
}