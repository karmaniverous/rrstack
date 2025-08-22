/**
 * Requirements addressed:
 * - RRStack façade over compiled rules with ordered cascade semantics.
 * - JSON persistence (toJson/fromJson).
 * - Rule reordering helpers (no-throw; no-ops at edges).
 * - Pure library surface; no side effects (no prints/exits).
 */

import { compileRule, type CompiledRule } from './compile';
import {
  EPOCH_MAX_MS,
  EPOCH_MIN_MS,
  type RRStackJsonV1,
  type RuleJson,
  type instantStatus,
  type rangeStatus,
} from './types';
import { classifyRange, getEffectiveBounds, getSegments as sweepSegments } from './sweep';
import { ruleCoversInstant } from './coverage';

export class RRStack {
  private timezone: string;
  private rules: RuleJson[] = [];
  private compiled: CompiledRule[] = [];

  constructor(opts: { timezone: string; rules?: RuleJson[] }) {
    this.timezone = opts.timezone;
    this.rules = [...(opts.rules ?? [])];
    this.recompile();
  }

  private recompile(): void {
    this.compiled = this.rules.map((r) => compileRule(r, this.timezone));
  }

  toJson(): RRStackJsonV1 {
    return {
      version: 1,
      timezone: this.timezone,
      rules: this.rules.map((r) => ({ ...r })),
    };
  }

  static fromJson(json: RRStackJsonV1): RRStack {
    return new RRStack({ timezone: json.timezone, rules: json.rules });
  }

  addRule(rule: RuleJson, position?: number): void {
    const pos = position === undefined ? this.rules.length : Math.max(0, Math.min(position, this.rules.length));
    this.rules.splice(pos, 0, rule);
    this.recompile();
  }

  swapRules(i: number, j: number): void {
    if (
      i < 0 ||
      j < 0 ||
      i >= this.rules.length ||
      j >= this.rules.length ||
      i === j
    ) {
      return;
    }
    const tmp = this.rules[i];
    this.rules[i] = this.rules[j];
    this.rules[j] = tmp;
    this.recompile();
  }

  ruleUp(i: number, steps = 1): void {
    if (i <= 0 || i >= this.rules.length) return;
    const newIndex = Math.max(0, i - Math.max(1, steps));
    const [item] = this.rules.splice(i, 1);
    this.rules.splice(newIndex, 0, item);
    this.recompile();
  }

  ruleDown(i: number, steps = 1): void {
    if (i < 0 || i >= this.rules.length - 1) return;
    const newIndex = Math.min(this.rules.length - 1, i + Math.max(1, steps));
    const [item] = this.rules.splice(i, 1);
    this.rules.splice(newIndex, 0, item);
    this.recompile();
  }

  ruleToTop(i: number): void {
    if (i <= 0 || i >= this.rules.length) return;
    const [item] = this.rules.splice(i, 1);
    this.rules.unshift(item);
    this.recompile();
  }

  ruleToBottom(i: number): void {
    if (i < 0 || i >= this.rules.length - 1) return;
    const [item] = this.rules.splice(i, 1);
    this.rules.push(item);
    this.recompile();
  }

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
    fromMs: number = EPOCH_MIN_MS,
    toMs: number = EPOCH_MAX_MS,
  ): Iterable<{ start: number; end: number; status: instantStatus }> {
    return sweepSegments(this.compiled, fromMs, toMs);
  }

  classifyRange(fromMs: number, toMs: number): rangeStatus {
    return classifyRange(this.compiled, fromMs, toMs);
  }

  getEffectiveBounds(): { start?: number; end?: number; empty: boolean } {
    return getEffectiveBounds(this.compiled);
  }
}
