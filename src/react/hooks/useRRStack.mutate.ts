import type { RefObject } from 'react';

import type { RRStack } from '../../rrstack/RRStack';
import type { RRStackOptions, RuleJson } from '../../rrstack/types';
import type { DebounceCfgNormalized } from './useRRStack.config';

export interface MutateManager {
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
  ensureRules: () => RuleJson[];
  stageTimezone: (tz: string) => void;
  getStaged: () => {
    rules?: RuleJson[];
    timezone?: string;
  } | null;
}

export const createMutateManager = (
  rrstackRef: RefObject<RRStack>,
  cfgRef: RefObject<DebounceCfgNormalized | undefined>,
  log: (t: 'commit') => void,
): MutateManager => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inWindow = false;
  let staging: { rules?: RuleJson[]; timezone?: string } | null = null;

  const ensureRules = (): RuleJson[] => {
    if (staging?.rules) return staging.rules;
    const next = [...(rrstackRef.current.rules as RuleJson[])];
    staging = { ...(staging ?? {}), rules: next };
    return next;
  };

  const stageTimezone = (tz: string): void => {
    staging = { ...(staging ?? {}), timezone: tz };
  };

  const commitNow = (): void => {
    if (!staging) return;
    const patch: Partial<Pick<RRStackOptions, 'timezone' | 'rules'>> = {};
    if (staging.timezone !== undefined) patch.timezone = staging.timezone;
    if (staging.rules !== undefined) patch.rules = staging.rules;
    staging = null;
    if (Object.keys(patch).length > 0) {
      rrstackRef.current.updateOptions(patch);
      log('commit');
    }
  };

  const schedule = (): void => {
    const cfg = cfgRef.current;
    if (!cfg) {
      commitNow();
      return;
    }
    const { delay, leading } = cfg;
    if (leading && !inWindow) commitNow();
    inWindow = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      inWindow = false;
      commitNow();
    }, delay);
  };

  const flush = (): void => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    inWindow = false;
    commitNow();
  };

  const cancel = (): void => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    inWindow = false;
    staging = null;
  };

  const getStaged = () => staging;

  return {
    schedule,
    flush,
    cancel,
    ensureRules,
    stageTimezone,
    getStaged,
  };
};
