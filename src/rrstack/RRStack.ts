/**
 * RRStack — timezone-aware cascade of RRULE-based coverage.
 *
 * RRStack evaluates a prioritized list of rules to answer point queries,
 * enumerate contiguous coverage segments, classify ranges, and compute
 * effective bounds. All computations are performed in the configured IANA * timezone with DST-correct duration arithmetic (Luxon).
 *
 * Notes
 * - Options are normalized and frozen on the instance.
 * - `timeUnit` is mutable via update(); retained rules convert clamp timestamps.
 * - Intervals are half-open [start, end). In 's' mode, ends are rounded up to
 *   the next integer second to avoid boundary false negatives.
 *
 * @public
 */

import { DateTime } from 'luxon';

import { type CompiledRule, compileRule } from './compile';
import { isValidTimeZone } from './coverage/time';
import { DEFAULT_DEFAULT_EFFECT } from './defaults';
import { describeCompiledRule, type DescribeOptions } from './describe';
import {
  normalizeOptions,
  ruleLiteSchema,
  timezoneIdSchema,
} from './RRStack.options';
import { toJsonSnapshot } from './RRStack.persistence';
import {
  classifyRangeOverWindow,
  getEffectiveBoundsFromCompiled,
  getSegmentsOverWindow,
  isActiveAtCompiled,
} from './RRStack.queries';
import {
  type InstantStatus,
  type Notice,
  type RangeStatus,
  type RRStackOptions,
  type RRStackOptionsNormalized,
  type RuleJson,
  type TimeZoneId,
  type UnixTimeUnit,
  type UpdatePolicy,
} from './types';
// Build-time injected in production bundles; fallback for dev/test.
declare const __RRSTACK_VERSION__: string | undefined;

export class RRStack {
  /** Internal: listeners for post‑mutation notifications. */
  private readonly __listeners = new Set<(self: RRStack) => void>();
  /** Internal: true after construction; used to suppress initial notify. */
  private __initialized = false;

  /**
   * Normalized, frozen options. Mutate via {@link timezone}, {@link rules},
   * or {@link update}.   */
  public readonly options: RRStackOptionsNormalized;

  private compiled: CompiledRule[] = [];

  /**
   * Build the baseline (virtual) span rule from defaultEffect.
   * - 'auto' =\> opposite of rule 0's effect, or 'active' when no rules.
   * - otherwise =\> the provided defaultEffect.
   */
  private baselineEffect(): InstantStatus {
    const de = this.options.defaultEffect;
    if (de !== DEFAULT_DEFAULT_EFFECT) return de;
    const hasFirst = this.options.rules.length > 0;
    if (!hasFirst) return 'active';
    const first = this.options.rules[0];
    return first.effect === 'active' ? 'blackout' : 'active';
  }

  /** Construct the compiled baseline span (open-start/open-end) in current tz/unit. */
  private makeBaseline(): CompiledRule {
    return compileRule(
      { effect: this.baselineEffect(), options: {} },
      this.options.timezone,
      this.options.timeUnit,
    );
  }
  /** Working set with baseline prepended (lowest priority). */
  private compiledWithBaseline(): CompiledRule[] {
    return [this.makeBaseline(), ...this.compiled];
  }
  /**
   * Create a new RRStack.
   *
   * @param opts - Constructor options. `timeUnit` defaults to `'ms'`.
   * @remarks Options are normalized and frozen on the instance. The stack   *          compiles its rules immediately. The optional `version` is ignored.
   */
  constructor(opts: RRStackOptions) {
    const normalized = normalizeOptions(opts);
    this.options = normalized;
    this.recompile(); // initial compile (no notify yet)
    // enable notifications for subsequent changes
    this.__initialized = true;
  }

  private recompile(): void {
    const { timezone, timeUnit, rules } = this.options;
    this.compiled = rules.map((r) => compileRule(r, timezone, timeUnit));
    if (this.__initialized) this.__notify();
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
    return tz as TimeZoneId;
  }

  // Observability -------------------------------------------------------------

  /**
   * Subscribe to post‑mutation notifications. The listener is invoked exactly
   * once after a successful state change (after recompile). The constructor
   * initialization does not trigger notifications.
   *
   * @returns Unsubscribe function.
   */
  subscribe(listener: (self: RRStack) => void): () => void {
    this.__listeners.add(listener);
    return () => {
      this.__listeners.delete(listener);
    };
  }

  /** @internal Notify all listeners (best‑effort; errors are swallowed). */
  private __notify(): void {
    for (const l of this.__listeners) {
      try {
        l(this);
      } catch {
        /* noop */
      }
    }
  }
  // Getters / setters (property-style) ---------------------------------------

  /**
   * Get the current IANA timezone id (unbranded string).
   */
  get timezone(): string {
    return this.options.timezone as string;
  }

  /**
   * Set the timezone and recompile.
   * @param next - IANA timezone id (validated).
   * @throws If the timezone is invalid.
   */
  set timezone(next: string) {
    const tz = timezoneIdSchema.parse(next) as unknown as TimeZoneId;
    const { timeUnit, rules, defaultEffect } = this.options;
    (this as { options: RRStackOptionsNormalized }).options = Object.freeze({
      timezone: tz,
      timeUnit,
      defaultEffect,
      rules,
    });
    this.recompile();
  }
  /**
   * Get the rule list (frozen).
   */
  get rules(): readonly RuleJson[] {
    return this.options.rules;
  }

  /**
   * Replace the rule list and recompile.
   * @param next - New rule array. A lightweight runtime check is applied;
   *               full validation occurs during compilation.
   */
  set rules(next: readonly RuleJson[]) {
    // Minimal rule-lite validation to fail fast; full validation in compile.
    next.forEach((r) => ruleLiteSchema.parse(r));
    const { timezone, timeUnit, defaultEffect } = this.options;
    const frozen = Object.freeze([...(next as RuleJson[])]); // preserve readonly externally
    (this as { options: RRStackOptionsNormalized }).options = Object.freeze({
      timezone,
      timeUnit,
      defaultEffect,
      rules: frozen,
    });
    this.recompile();
  }
  /**   * Get the configured time unit ('ms' | 's'). Immutable.
   */
  get timeUnit(): UnixTimeUnit {
    return this.options.timeUnit;
  }

  /**
   * Ingest a partial RRStackOptions JSON with version/unit handling, replacements, and notices.
   * - Applies timezone, defaultEffect, rules, and timeUnit in one pass.
   * - Version pipeline (upgrade-config) executes first; defaults:
   *   • onVersionUp: 'off', onVersionDown: 'error', onVersionInvalid: 'error'.
   * - timeUnit change:
   *   • If rules provided: replace rules as-is (assumed in new unit).
   *   • If not: convert retained rules' options.starts/options.ends between units (ms ↔ s).
   * - Recompiles exactly once on success.
   */
  update(
    partial: Partial<RRStackOptions> = {},
    policy: UpdatePolicy = {},
  ): readonly Notice[] {
    const notices: Notice[] = [];
    const emit = (n: Notice) => {
      notices.push(n);
      try {
        policy.onNotice?.(n);
      } catch {
        /* noop */
      }
    };

    // 1) Version handling
    const engineVersion =
      (typeof __RRSTACK_VERSION__ === 'string' && __RRSTACK_VERSION__) ||
      '0.0.0';
    const incomingRaw = partial.version;
    const isValid = (v: unknown): v is string =>
      typeof v === 'string' && SEMVER_RE.test(v);

    const pv = policy.onVersionInvalid ?? 'error';
    const pu = policy.onVersionUp ?? 'off';
    const pd = policy.onVersionDown ?? 'error';

    if (incomingRaw !== undefined && !isValid(incomingRaw)) {
      // invalid semver
      const n: Notice = {
        kind: 'versionInvalid',
        level: pv === 'error' ? 'error' : pv === 'warn' ? 'warn' : 'info',
        raw: incomingRaw,
        to: engineVersion,
        action: pv === 'error' ? 'rejected' : 'ingestAsCurrent',
      };
      emit(n);
      if (pv === 'error') throw new Error('update: invalid version');
      // ingest as current (no-op upgrader)
      // upgradeConfig(engine→engine) is a no-op today.
    } else if (typeof incomingRaw === 'string') {
      const cmp = cmpSemver(incomingRaw, engineVersion);
      if (cmp < 0) {
        // incoming older (versionUp path)
        const n: Notice = {
          kind: 'versionUp',
          level: pu === 'error' ? 'error' : pu === 'warn' ? 'warn' : 'info',
          from: incomingRaw,
          to: engineVersion,
          action: pu === 'error' ? 'rejected' : 'upgrade',
        };
        emit(n);
        if (pu === 'error') throw new Error('update: older version rejected');
        // Accept: upgradeConfig(incoming→engine) — no-op today.
      } else if (cmp > 0) {
        // incoming newer (versionDown path)
        const n: Notice = {
          kind: 'versionDown',
          level: pd === 'error' ? 'error' : pd === 'warn' ? 'warn' : 'info',
          from: incomingRaw,
          to: engineVersion,
          action: pd === 'error' ? 'rejected' : 'ingestAsCurrent',
        };
        emit(n);
        if (pd === 'error') {
          throw new Error('update: newer version rejected');
        }
        // Accept as current; upgradeConfig(engine→engine) — no-op today.
      }
    }

    // 2) Prepare next state with unit conversion if needed
    const fromUnit = this.options.timeUnit;
    const toUnit: UnixTimeUnit = partial.timeUnit ?? fromUnit;
    const unitChanged = toUnit !== fromUnit;
    let unitNotice: Extract<Notice, { kind: 'timeUnitChange' }> | undefined;

    const pt = policy.onTimeUnitChange ?? 'warn';
    if (unitChanged) {
      unitNotice = {
        kind: 'timeUnitChange',
        level: pt === 'error' ? 'error' : pt === 'warn' ? 'warn' : 'info',
        from: fromUnit,
        to: toUnit,
        action: 'convertedExisting',
      };
      // Decide early exit on error
      if (pt === 'error') {
        unitNotice.action = 'rejected';
        emit(unitNotice);
        throw new Error('update: timeUnit change rejected by policy');
      }
      // Defer emit until we know which path (convert vs incoming rules).
    }

    const nextTz =
      partial.timezone !== undefined
        ? (timezoneIdSchema.parse(partial.timezone) as unknown as TimeZoneId)
        : this.options.timezone;
    const nextDefault = partial.defaultEffect ?? this.options.defaultEffect;

    let nextRules: readonly RuleJson[];
    if (partial.rules !== undefined) {
      // Replace with incoming; assume already in the new unit.
      nextRules = Object.freeze([...partial.rules]);
      if (unitNotice) {
        unitNotice.action = 'acceptedIncomingRules';
        unitNotice.replacedRuleCount = nextRules.length;
      }
    } else {
      // Retain existing rules; convert clamps if unit changed.
      nextRules = this.options.rules;
      if (unitChanged) {
        const converted = convertRulesUnit(
          nextRules as RuleJson[],
          fromUnit,
          toUnit,
        );
        nextRules = Object.freeze(converted);
        if (unitNotice) {
          unitNotice.action = 'convertedExisting';
          unitNotice.convertedRuleCount = converted.length;
        }
      }
    }

    // 3) Commit and recompile
    (this as { options: RRStackOptionsNormalized }).options = Object.freeze({
      timezone: nextTz,
      timeUnit: toUnit,
      defaultEffect: nextDefault,
      rules: nextRules,
    });
    this.recompile();

    if (unitNotice) emit(unitNotice);
    return notices;
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

  /**
   * Format an instant using this stack's configured timezone and time unit.
   * - In 'ms' mode, `t` is interpreted as milliseconds since epoch.
   * - In 's' mode, `t` is interpreted as integer seconds since epoch.
   *
   * @param t - Instant in the configured unit.
   * @param opts - Optional formatting:
   *   - format?: Luxon toFormat string (e.g., 'yyyy-LL-dd HH:mm').
   *   - locale?: BCP-47 locale tag applied prior to formatting.
   * @returns A string representation (ISO by default).
   *
   * @example
   * stack.formatInstant(Date.UTC(2024, 0, 2, 5, 30, 0)); // '2024-01-02T05:30:00Z' (UTC)
   * stack.formatInstant(ms, \{ format: 'yyyy-LL-dd HH:mm' \}); // '2024-01-02 05:30'
   */
  formatInstant(
    t: number,
    opts?: { format?: string; locale?: string },
  ): string {
    const tz = this.timezone;
    const dt =
      this.timeUnit === 'ms'
        ? DateTime.fromMillis(t, { zone: tz })
        : DateTime.fromSeconds(t, { zone: tz });
    const d = opts?.locale ? dt.setLocale(opts.locale) : dt;
    if (opts?.format) return d.toFormat(opts.format);
    return d.toISO({ suppressMilliseconds: true }) ?? '';
  }

  // JSON persistence ----------------------------------------------------------

  /**
   * Serialize the stack to JSON.
   * @returns A {@link RRStackOptions} including `version` injected at build time   *          (fallback `'0.0.0'` in dev/test).
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
    return isActiveAtCompiled(this.compiledWithBaseline(), t);
  }

  /**   * Stream contiguous status segments over `[from, to)`.   *
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
   *
   * @example Using a limit to cap enumeration and guard long windows
   * ```ts
   * const segs: Array<{ start: number; end: number; status: 'active' | 'blackout' }> = [];
   * try {
   *   for (const seg of stack.getSegments(from, to, { limit: 1000 })) {
   *     segs.push(seg);
   *   }
   * } catch (err) {
   *   // If more than 1000 segments would be produced, an Error is thrown.
   *   // Consider reducing the window or processing in chunks (e.g., day/week).
   * }
   * ```
   *
   * Note: The iterator is streaming and memory-bounded, but the number of
   * segments can be large when many rules overlap across long windows.
   * Use the `limit` option to make this explicit, or query in smaller chunks
   * for real-time UIs.
   */
  getSegments(
    from: number,
    to: number,
    opts?: { limit?: number },
  ): Iterable<{ start: number; end: number; status: InstantStatus }> {
    return getSegmentsOverWindow(this.compiledWithBaseline(), from, to, opts);
  } /**
   * Classify a range `[from, to)` as `'active'`, `'blackout'`, or `'partial'`.
   * @param from - Start of the window (inclusive), in the configured unit.
   * @param to - End of the window (exclusive), in the configured unit.   */
  classifyRange(from: number, to: number): RangeStatus {
    return classifyRangeOverWindow(this.compiledWithBaseline(), from, to);
  }

  /**   * Compute effective active bounds across all rules.
   * @returns `{ start?: number; end?: number; empty: boolean }`
   * - `start` and/or `end` are omitted for open-sided coverage.
   * - `empty` indicates no active coverage.
   *
   * @example Open-ended end
   * ```ts
   * const stack = new RRStack({
   *   timezone: 'UTC',
   *   rules: [{
   *     effect: 'active',
   *     duration: { hours: 1 },
   *     options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0], starts: Date.UTC(2024, 0, 10, 0, 0, 0) },
   *   }],
   * });
   * const b = stack.getEffectiveBounds();
   * // b.start is 2024-01-10T05:00:00Z (number); b.end is undefined (open end)
   * ```
   */
  getEffectiveBounds(): { start?: number; end?: number; empty: boolean } {
    return getEffectiveBoundsFromCompiled(this.compiledWithBaseline());
  }
  /**
   * Describe a rule by index as human-readable text.
   * Leverages rrule.toText() plus effect and duration phrasing.   *
   * @param index - Zero-based index into {@link rules}.
   * @param opts - Description options (timezone/bounds toggles).
   * @throws RangeError if index is out of bounds; TypeError if not an integer.
   *
   * @example
   * ```ts
   * const text = stack.describeRule(0, { includeTimeZone: true, includeBounds: true });
   * // e.g., "Active for 1 hour: every day at 5:00 (timezone UTC) [from 2024-01-10T00:00:00Z]"
   * ```
   */
  describeRule(index: number, opts: DescribeOptions = {}): string {
    if (!Number.isInteger(index)) {
      throw new TypeError('rule index must be an integer');
    }
    if (index < 0 || index >= this.compiled.length)
      throw new RangeError('rule index out of range');
    return describeCompiledRule(this.compiled[index], opts);
  }

  // Convenience rule mutators -------------------------------------------------

  /**
   * Insert a rule at a specific index (or append when index is omitted).
   * Delegates to the {@link rules} setter (single recompile).
   * When called with no arguments, inserts a default span rule:
   * `{ effect: 'active', options: {} }`.
   */
  addRule(rule?: RuleJson, index?: number): void {
    // Default to an active, open-ended span when no rule is provided.
    const effectiveRule: RuleJson = rule ?? { effect: 'active', options: {} };
    // Lightweight validation
    ruleLiteSchema.parse(effectiveRule);
    const next = [...(this.options.rules as RuleJson[])];
    if (index === undefined) {
      next.push(effectiveRule);
    } else {
      if (!Number.isInteger(index))
        throw new TypeError('index must be an integer');
      if (index < 0 || index > next.length)
        throw new RangeError('index out of range');
      next.splice(index, 0, effectiveRule);
    }
    this.rules = next;
  }

  /**   * Remove the rule at the specified index.
   * Delegates to the {@link rules} setter (single recompile).
   *
   * @param i - Zero-based index of the rule to remove.
   * @throws TypeError if `i` is not an integer; RangeError if out of range.
   */
  removeRule(i: number): void {
    if (!Number.isInteger(i)) throw new TypeError('index must be an integer');
    const n = this.options.rules.length;
    if (i < 0 || i >= n) throw new RangeError('index out of range');

    const next = [...(this.options.rules as RuleJson[])];
    next.splice(i, 1);
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
    if (i < 0 || i >= n || j < 0 || j >= n)
      throw new RangeError('index out of range');
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

// -------- Internal helpers (semver + unit conversion) ------------------------

// Minimal semver (x.y.z) validator; allows pre-release/build suffixes.
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const cmpNum = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0);

/** Compare two semver strings (ignoring pre-release/build for ordering). */
function cmpSemver(a: string, b: string): number {
  const parse = (s: string): [number, number, number] => {
    const main = s.split('-')[0].split('+')[0];
    const [ma, mi, pa] = main.split('.').map((x) => Number(x));
    return [ma || 0, mi || 0, pa || 0];
  };
  const [a0, a1, a2] = parse(a);
  const [b0, b1, b2] = parse(b);
  return cmpNum(a0, b0) || cmpNum(a1, b1) || cmpNum(a2, b2);
}

/** Convert retained rules' clamp timestamps (starts/ends) between ms and s. */
function convertRulesUnit(
  rules: readonly RuleJson[],
  fromUnit: UnixTimeUnit,
  toUnit: UnixTimeUnit,
): RuleJson[] {
  if (fromUnit === toUnit) return [...rules];
  const toS = fromUnit === 'ms' && toUnit === 's';
  const toMs = fromUnit === 's' && toUnit === 'ms';
  const conv = (n: number | undefined): number | undefined => {
    if (typeof n !== 'number') return n;
    return toS ? Math.trunc(n / 1000) : toMs ? n * 1000 : n;
  };
  return rules.map((r) => {
    const opts = { ...(r.options as Record<string, unknown>) };
    if (typeof (opts as { starts?: number }).starts === 'number') {
      (opts as { starts?: number }).starts = conv(
        (opts as { starts?: number }).starts,
      );
    }
    if (typeof (opts as { ends?: number }).ends === 'number') {
      (opts as { ends?: number }).ends = conv((opts as { ends?: number }).ends);
    }
    return {
      effect: r.effect,
      duration: r.duration,
      options: opts as RuleJson['options'],
      label: r.label,
    };
  });
}
