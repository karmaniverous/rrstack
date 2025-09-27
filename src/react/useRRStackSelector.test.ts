import { act } from 'react';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import type { RRStack } from '../rrstack/RRStack';
import type { RRStackOptions, RuleJson } from '../rrstack/types';
import { useRRStack } from './useRRStack';
import { useRRStackSelector } from './useRRStackSelector';

const EXAMPLE: RRStackOptions = {
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

const ruleAt = (h: number, label: string): RuleJson => ({
  effect: 'active',
  duration: { minutes: 15 },
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
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useRRStackSelector', () => {
  it('recomputes derived value on mutation', () => {
    let current: RRStack | undefined;
    function Probe() {
      const { rrstack } = useRRStack({ json: EXAMPLE });
      const derived = useRRStackSelector(rrstack, (s) => s.rules.length);
      useEffect(() => {
        current = rrstack;
      }, [rrstack]);
      return React.createElement('div', { 'data-derived': String(derived) });
    }

    const app = mount(React.createElement(Probe));
    const div = app.container.querySelector('div')!;

    // initial
    expect(div.getAttribute('data-derived')).toBe('1');

    act(() => {
      current!.addRule(ruleAt(7, 'x'));
    });
    expect(div.getAttribute('data-derived')).toBe('2');

    app.unmount();
  });
});
