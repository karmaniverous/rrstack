import type { RefObject } from 'react';

import type { RRStack } from '../../rrstack/RRStack';
import type { RRStackOptions, RuleJson } from '../../rrstack/types';
import type { MutateManager } from './useRRStack.mutate';

export const createRRStackFacade = (
  rrstackRef: RefObject<RRStack>,
  mutate: MutateManager,
): RRStack =>
  new Proxy(rrstackRef.current as unknown as object, {
    get(_t, prop) {
      const staged = (): { rules?: RuleJson[]; timezone?: string } | null =>
        mutate.getStaged();

      if (prop === 'rules') {
        // Prefer staged over committed for UI echo
        return staged()?.rules ?? rrstackRef.current.rules;
      }
      if (prop === 'timezone') {
        return staged()?.timezone ?? rrstackRef.current.timezone;
      }
      if (prop === 'toJson') {
        return () => {
          const snap = rrstackRef.current.toJson();
          const s = staged();
          return {
            ...snap,
            ...(s?.timezone !== undefined ? { timezone: s.timezone } : null),
            ...(s?.rules !== undefined ? { rules: s.rules } : null),
          };
        };
      }
      if (prop === 'addRule') {
        return (rule?: RuleJson, index?: number) => {
          const arr = mutate.ensureRules();
          const effectiveRule: RuleJson =
            rule ?? ({ effect: 'active', options: {} } as RuleJson);
          if (index === undefined) arr.push(effectiveRule);
          else arr.splice(index, 0, effectiveRule);
          mutate.schedule();
        };
      }
      if (prop === 'removeRule') {
        return (i: number) => {
          const arr = mutate.ensureRules();
          arr.splice(i, 1);
          mutate.schedule();
        };
      }
      if (prop === 'swap') {
        return (i: number, j: number) => {
          const arr = mutate.ensureRules();
          [arr[i], arr[j]] = [arr[j], arr[i]];
          mutate.schedule();
        };
      }
      if (prop === 'up') {
        return (i: number) => {
          const arr = mutate.ensureRules();
          if (i <= 0 || i >= arr.length) return;
          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          mutate.schedule();
        };
      }
      if (prop === 'down') {
        return (i: number) => {
          const arr = mutate.ensureRules();
          if (i < 0 || i >= arr.length - 1) return;
          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
          mutate.schedule();
        };
      }
      if (prop === 'top') {
        return (i: number) => {
          const arr = mutate.ensureRules();
          if (i <= 0 || i >= arr.length) return;
          const [r] = arr.splice(i, 1);
          arr.unshift(r);
          mutate.schedule();
        };
      }
      if (prop === 'bottom') {
        return (i: number) => {
          const arr = mutate.ensureRules();
          if (i < 0 || i >= arr.length) return;
          const [r] = arr.splice(i, 1);
          arr.push(r);
          mutate.schedule();
        };
      }
      // fall through to real instance for all other members
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return (rrstackRef.current as unknown as Record<PropertyKey, any>)[prop];
    },
    set(_t, prop, value) {
      if (prop === 'timezone' && typeof value === 'string') {
        mutate.stageTimezone(value);
        mutate.schedule();
        return true;
      }
      if (prop === 'rules' && Array.isArray(value)) {
        const arr = [...(value as RuleJson[])];
        mutate.stageRules(arr);
        mutate.schedule();
        return true;
      }
      // block unknown direct sets to keep façade deterministic
      return false;
    },
  }) as unknown as RRStack;
