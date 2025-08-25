/**
 * Requirements addressed:
 * - Thin query façade to keep RRStack.ts focused and short.
 * - Reuse existing streaming and coverage services.
 */

import type { CompiledRule } from './compile';
import { ruleCoversInstant } from './coverage';
import { classifyRange, getEffectiveBounds, getSegments } from './sweep';
import type { instantStatus, rangeStatus } from './types';

export const isActiveAtCompiled = (
  compiled: CompiledRule[],
  t: number,
): instantStatus => {
  let status: instantStatus = 'blackout';
  for (let i = 0; i < compiled.length; i++) {
    if (ruleCoversInstant(compiled[i], t)) {
      status = compiled[i].effect;
    }
  }
  return status;
};

export const getSegmentsOverWindow = (
  compiled: CompiledRule[],
  from: number,
  to: number,
) => getSegments(compiled, from, to);

export const classifyRangeOverWindow = (
  compiled: CompiledRule[],
  from: number,
  to: number,
): rangeStatus => classifyRange(compiled, from, to);

export const getEffectiveBoundsFromCompiled = (compiled: CompiledRule[]) =>
  getEffectiveBounds(compiled);
