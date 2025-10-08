import type { CompiledRule } from '../compile';
import { compileRule } from '../compile';
import { DEFAULT_TIME_UNIT } from '../defaults';
import type { RuleJson, TimeZoneId, UnixTimeUnit } from '../types';
import type { DescribeConfig } from './config';
import { buildRuleDescriptor } from './descriptor';
import {
  type DescribeTranslator,
  strictEnTranslator,
} from './translate/strict';

/**
 * Build a plain-language description of a compiled rule (unified config).
 */
export const describeCompiledRule = (
  compiled: CompiledRule,
  cfg: DescribeConfig = {},
): string => {
  const tx: DescribeTranslator =
    typeof cfg.translator === 'function' ? cfg.translator : strictEnTranslator;
  const desc = buildRuleDescriptor(compiled);
  return tx(desc, cfg);
};
/**
 * Build a plain-language description of a JSON rule in a given tz/unit.
 * Convenience wrapper that compiles the rule with the provided context.
 */
export const describeRule = (
  rule: RuleJson,
  timezone: TimeZoneId,
  timeUnit?: UnixTimeUnit,
  cfg: DescribeConfig = {},
): string => {
  // Downstream callers may reasonably pass undefined to use the library default.
  const effectiveUnit = timeUnit ?? DEFAULT_TIME_UNIT;
  const compiled = compileRule(rule, timezone, effectiveUnit);
  return describeCompiledRule(compiled, cfg);
};
