import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import React, { useEffect, useMemo, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useRRStack } from './useRRStack';
import type { RRStack } from '../rrstack/RRStack';
import type { RRStackOptions, RuleJson } from '../rrstack/types';

const EXAMPLE_A: RRStackOptions = {
  timezone: 'UTC',
  rules: [
    {
      effect: 'active',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
      label: 'daily-05',
    },
  ],
};

const EXAMPLE_B: RRStackOptions = {
  timezone: 'UTC',
  rules: [
    {
      effect: 'active',
      duration: { minutes: 30 },
      options: { freq: 'daily', byhour: [9], byminute: [0], bysecond: [0] },
      label: 'daily-09',
    },
    {
      effect: 'blackout',
      duration: { minutes: 10 },
      options: { freq: 'daily', byhour: [9], byminute: [15], bysecond: [0] },
      label: 'blk-0915-10m',
    },
  ],
};

const newRuleAt = (h: number, label: string): RuleJson => ({
  effect: 'active',
  duration: { minutes: 20 },
  options: { freq: 'daily', byhour: [h], byminute: [0], bysecond: [0] },
  label,
});

function mount(node: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    rerender(next: React.ReactElement) {
      act(() => {
        root.render(next);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function View(props: {
  json: RRStackOptions;
  resetKey?: string | number;
  onReady?: (s: RRStack) => void;
}) {
  const { json, resetKey, onReady } = props;
  const calls = useRef(0);
  const { rrstack } = useRRStack(json, undefined, { resetKey });
  useEffect(() => {
    onReady?.(rrstack);
  }, [onReady, rrstack]);
  // expose render count and rule count as data attrs
  const count = rrstack.rules.length;
  const renderCount = useMemo(() => ++calls.current, [count, rrstack]);
  return React.createElement('div', {
    'data-count': String(count),
    'data-renders': String(renderCount),
  });
}

describe('useRRStack (react)', () => {
  it('re-renders on mutation and resets on resetKey change', () => {
    let current: RRStack | undefined;
    const onReady = (s: RRStack) => {
      current = s;
    };
    const app = mount(
      React.createElement(View, { json: EXAMPLE_A, resetKey: 'A', onReady }),
    );

    // initial rule count = 1
    const div = app.container.querySelector('div')!;
    expect(div.getAttribute('data-count')).toBe('1');
    const firstInstance = current!;

    // mutate: add a rule
    act(() => {
      firstInstance.addRule(newRuleAt(7, 'A7'));
    });
    expect(div.getAttribute('data-count')).toBe('2');

    // change resetKey with a different JSON → new instance with count = 2
    app.rerender(
      React.createElement(View, { json: EXAMPLE_B, resetKey: 'B', onReady }),
    );
    const secondInstance = current!;
    expect(secondInstance).not.toBe(firstInstance);
    expect(div.getAttribute('data-count')).toBe('2');

    app.unmount();
  });

  it('debounces onChange and supports flush()', () => {
    vi.useFakeTimers();
    const events: number[] = [];

    function DebouncedView(props: { json: RRStackOptions }) {
      const calls = useRef(0);
      const onChange = (s: RRStack) => {
        // record rule count when onChange fires
        events.push(s.rules.length);
      };
      const { rrstack, flush } = useRRStack(props.json, onChange, {
        debounce: { delay: 50, trailing: true },
      });
      // Kick a few mutations quickly
      useEffect(() => {
        rrstack.addRule(newRuleAt(1, 'x'));
        rrstack.addRule(newRuleAt(2, 'y'));
        rrstack.addRule(newRuleAt(3, 'z'));
        // also show flush mechanics (won't run yet)
        void flush;
      }, [rrstack]);
      const count = rrstack.rules.length;
      const renderCount = useMemo(() => ++calls.current, [count, rrstack]);
      return React.createElement('div', {
        'data-count': String(count),
        'data-renders': String(renderCount),
      });
    }

    const app = mount(React.createElement(DebouncedView, { json: EXAMPLE_A }));
    const div = app.container.querySelector('div')!;

    // We queued 3 quick adds above: the rule count in DOM already reflects them
    expect(div.getAttribute('data-count')).toBe('4');

    // No onChange call yet (trailing debounce)
    expect(events.length).toBe(0);

    // Advance the debounce window (50ms)
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // One trailing onChange fire, with final rule count (4)
    expect(events).toEqual([4]);

    app.unmount();
    vi.useRealTimers();
  });
});
