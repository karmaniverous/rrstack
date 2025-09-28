import { Window } from 'happy-dom';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { bench, describe } from 'vitest';

import type { RRStackOptions, RuleJson } from '../rrstack/types';
import { useRRStack } from './useRRStack';

// Minimal DOM for React in vitest bench (node environment)
(function ensureDom() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const w = new Window();
    // @ts-expect-error assign globals for bench environment
    globalThis.window = w.window;
    // @ts-expect-error assign globals for bench environment
    globalThis.document = w.document;
    // @ts-expect-error assign globals for bench environment
    globalThis.navigator = { userAgent: 'happy-dom' };
  }
})();

// Tiny rule factory for quick façade operations
const ruleAt = (h: number, label?: string): RuleJson => ({
  effect: 'active',
  duration: { minutes: 15 },
  options: { freq: 'daily', byhour: [h], byminute: [0], bysecond: [0] },
  label,
});

interface HookBenchApi {
  addRule: () => void;
  setRules: () => void;
  toJson: () => void;
  flushMutations: () => void;
  flushChanges: () => void;
}

let api: HookBenchApi | undefined;

function Harness({ json }: { json: RRStackOptions }) {
  // Keep benches deterministic: no debouncers by default (immediate commit).
  const { rrstack, flushMutations, flushChanges } = useRRStack({ json });
  const seq = React.useRef(0);

  React.useEffect(() => {
    api = {
      addRule: () => {
        const idx = (seq.current = (seq.current + 1) % 24);
        rrstack.addRule(ruleAt(idx));
      },
      setRules: () => {
        const i = (seq.current = (seq.current + 1) % 24);
        rrstack.rules = [ruleAt(i, 'A'), ruleAt((i + 1) % 24, 'B')];
      },
      toJson: () => {
        rrstack.toJson();
      },
      flushMutations,
      flushChanges,
    };
  }, [rrstack, flushMutations, flushChanges]);

  return null;
}

// Mount once for benches
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
const baseJson: RRStackOptions = { timezone: 'UTC', rules: [] };
root.render(React.createElement(Harness, { json: baseJson }));

describe('React hooks (useRRStack) — vitest bench', () => {
  bench('useRRStack: façade addRule (immediate)', () => {
    api!.addRule();
  });

  bench('useRRStack: façade rules setter (bulk replace)', () => {
    api!.setRules();
  });

  bench('useRRStack: toJson (with staged overlay support)', () => {
    api!.toJson();
  });
});
