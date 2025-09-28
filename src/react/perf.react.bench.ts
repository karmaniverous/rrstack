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

// React 18/19: mark environment as act-enabled for benches to avoid warnings.
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
  removeRule: () => void;
  swap: () => void;
  up: () => void;
  down: () => void;
  top: () => void;
  bottom: () => void;
}

let api: HookBenchApi | undefined;

function Harness({ json }: { json: RRStackOptions }) {
  // Keep benches deterministic: no debouncers by default (immediate commit).
  const { rrstack, flushMutations, flushChanges } = useRRStack({ json });
  const seq = React.useRef(0);

  const ensureCount = React.useCallback(
    (n: number) => {
      while (rrstack.rules.length < n) {
        const idx = (seq.current = (seq.current + 1) % 24);
        rrstack.addRule(ruleAt(idx));
      }
    },
    [rrstack],
  );

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
      removeRule: () => {
        if (rrstack.rules.length === 0) {
          ensureCount(1);
        }
        const last = rrstack.rules.length - 1;
        if (last >= 0) rrstack.removeRule(last);
      },
      swap: () => {
        ensureCount(2);
        rrstack.swap(0, rrstack.rules.length - 1);
      },
      up: () => {
        ensureCount(3);
        const last = rrstack.rules.length - 1;
        rrstack.up(last);
      },
      down: () => {
        ensureCount(3);
        rrstack.down(0);
      },
      top: () => {
        ensureCount(3);
        const last = rrstack.rules.length - 1;
        rrstack.top(last);
      },
      bottom: () => {
        ensureCount(3);
        rrstack.bottom(0);
      },
    };
  }, [rrstack, flushMutations, flushChanges, ensureCount]);

  return null;
}

// Mount once for benches
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
const baseJson: RRStackOptions = { timezone: 'UTC', rules: [] };
React.act(() => {
  root.render(React.createElement(Harness, { json: baseJson }));
});

describe('React hooks (useRRStack) — vitest bench', () => {
  bench('useRRStack: façade addRule (immediate)', () => {
    React.act(() => {
      api!.addRule();
    });
  });

  bench('useRRStack: façade rules setter (bulk replace)', () => {
    React.act(() => {
      api!.setRules();
    });
  });

  bench('useRRStack: toJson (with staged overlay support)', () => {
    api!.toJson();
  });

  // Additional mutators
  bench('useRRStack: façade removeRule', () => {
    React.act(() => {
      api!.removeRule();
    });
  });

  bench('useRRStack: façade swap', () => {
    React.act(() => {
      api!.swap();
    });
  });

  bench('useRRStack: façade up', () => {
    React.act(() => {
      api!.up();
    });
  });

  bench('useRRStack: façade down', () => {
    React.act(() => {
      api!.down();
    });
  });

  bench('useRRStack: façade top', () => {
    React.act(() => {
      api!.top();
    });
  });

  bench('useRRStack: façade bottom', () => {
    React.act(() => {
      api!.bottom();
    });
  });
});
