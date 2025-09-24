import type { MutableRefObject } from 'react';
import type { RRStack } from '../rrstack/RRStack';
import type { RRStackOptions, RuleJson } from '../rrstack/types';
import type { DebounceCfgNormalized } from './debounce.util';

export interface MutateFacade {
  facade: RRStack;
  flush: () => void;
  cancel: () => void;
}

/**
 * Build a façade (Proxy) that stages rrstack mutations and commits once per window.
 * - Staged getters overlay rules/timezone; toJson overlays staged values.
 * - Queries still reflect the last committed compiled state.
 * - Trailing commit is always performed; leading commit is optional.
 */
export const createMutateFacade = (
  rrstackRef: MutableRefObject<RRStack>,
  cfgRef: MutableRefObject<DebounceCfgNormalized | undefined>,
  log: (t: 'commit') => void,
): MutateFacade => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inWindow = false;
  let staging: { rules?: RuleJson[]; timezone?: string } | null = null;

  const rulesSnapshot = (): RuleJson[] => {
    if (staging?.rules) return staging.rules;
    const next = [...(rrstackRef.current.rules as RuleJson[])];
    staging = { ...(staging ?? {}), rules: next };
    return next;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

  const facade = new Proxy(rrstackRef.current as unknown as object, {
    get(_t, prop) {
      if (prop === 'rules') {
        // Prefer staged over committed for UI echo
        return staging?.rules ?? rrstackRef.current.rules;
      }
      if (prop === 'timezone') {
        return staging?.timezone ?? rrstackRef.current.timezone;
      }
      if (prop === 'toJson') {
        return () => {
          const snap = rrstackRef.current.toJson();
          const tz = staging?.timezone;
          const rules = staging?.rules;
          return {
            ...snap,
            ...(tz !== undefined ? { timezone: tz } : null),
            ...(rules !== undefined ? { rules } : null),
          };
        };
      }
      if (prop === 'updateOptions') {
        return (p: Partial<Pick<RRStackOptions, 'timezone' | 'rules'>>) => {
          if (p.timezone !== undefined) stageTimezone(p.timezone);
          if (p.rules !== undefined) staging = { ...(staging ?? {}), rules: [...p.rules] };
          schedule();
        };
      }
      if (prop === 'addRule') {
        return (rule: RuleJson, index?: number) => {
          const arr = rulesSnapshot();
          if (index === undefined) arr.push(rule);
          else arr.splice(index, 0, rule);
          schedule();
        };
      }
      if (prop === 'removeRule') {
        return (i: number) => {
          const arr = rulesSnapshot();
          arr.splice(i, 1);
          schedule();
        };
      }
      if (prop === 'swap') {
        return (i: number, j: number) => {
          const arr = rulesSnapshot();
          [arr[i], arr[j]] = [arr[j], arr[i]];
          schedule();
        };
      }
      if (prop === 'up') {
        return (i: number) => {
          const arr = rulesSnapshot();
          if (i <= 0 || i >= arr.length) return;
          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          schedule();
        };
      }
      if (prop === 'down') {
        return (i: number) => {
          const arr = rulesSnapshot();
          if (i < 0 || i >= arr.length - 1) return;
          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
          schedule();
        };
      }
      if (prop === 'top') {
        return (i: number) => {
          const arr = rulesSnapshot();
          if (i <= 0 || i >= arr.length) return;

