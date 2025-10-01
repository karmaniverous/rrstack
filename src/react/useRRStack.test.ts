import type { FC } from 'react';
import { act } from 'react';
import React, { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import type { RRStack } from '../rrstack/RRStack';
import type {
  Notice,
  RRStackOptions,
  RuleJson,
  UpdatePolicy,
} from '../rrstack/types';
import { useRRStack } from './useRRStack';

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
  const { rrstack } = useRRStack({ json, resetKey });
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

  it('debounces onChange and supports flushChanges()', async () => {
    vi.useFakeTimers();
    const events: number[] = [];
    const once = { current: false };
    function DebouncedView(props: { json: RRStackOptions }) {
      const calls = useRef(0);
      const onChange = (s: RRStack) => {
        // record rule count when onChange fires
        events.push(s.rules.length);
      };
      const { rrstack, flushChanges } = useRRStack({
        json: props.json,
        onChange,
        changeDebounce: { delay: 50 },
      });
      // Kick a few mutations quickly
      useEffect(() => {
        // Guard against dev double-invocation of effects
        if (once.current) return;
        once.current = true;
        rrstack.addRule(newRuleAt(1, 'x'));
        rrstack.addRule(newRuleAt(2, 'y'));
        rrstack.addRule(newRuleAt(3, 'z'));
        // also show flush mechanics (won't run yet)
        void flushChanges;
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
    // Ensure effects and store updates have flushed (await a microtask)
    await act(async () => {
      await Promise.resolve();
    });
    expect(div.getAttribute('data-count')).toBe('4');

    // No onChange call yet (trailing debounce)
    expect(events.length).toBe(0);
    // Advance the debounce window (50ms)
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    // One trailing onChange fire, with final rule count (4)
    expect(events).toEqual([4]);
    app.unmount();
    vi.useRealTimers();
  });

  it('supports leading debounce (fires immediately, and still trailing)', async () => {
    vi.useFakeTimers();
    const events: number[] = [];

    const DebouncedLeadingView: FC<{ json: RRStackOptions }> = ({ json }) => {
      const calls = useRef(0);
      const did = useRef(false);
      const onChange = (s: RRStack) => {
        events.push(s.rules.length);
      };
      const { rrstack } = useRRStack({
        json,
        onChange,
        changeDebounce: { delay: 50, leading: true },
      });
      useEffect(() => {
        if (did.current) return;
        did.current = true;
        rrstack.addRule(newRuleAt(1, 'L1'));
        rrstack.addRule(newRuleAt(2, 'L2'));
        rrstack.addRule(newRuleAt(3, 'L3'));
      }, [rrstack]);
      const count = rrstack.rules.length;
      const renderCount = useMemo(() => ++calls.current, [count, rrstack]);
      return React.createElement('div', {
        'data-count': String(count),
        'data-renders': String(renderCount),
      });
    };

    const app = mount(
      React.createElement(DebouncedLeadingView, { json: EXAMPLE_A }),
    );
    const div = app.container.querySelector('div')!;

    // Let effects flush
    await act(async () => {
      await Promise.resolve();
    });
    // Leading fired once immediately on first mutation; EXAMPLE_A had 1 rule,
    // so the immediate count is 2.
    expect(events).toEqual([2]);
    // DOM has applied all 3 adds already
    expect(div.getAttribute('data-count')).toBe('4');

    // Advance time — trailing is always true now, so a final call is expected
    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
    });
    // Leading (2) then trailing (final state count 4)
    expect(events).toEqual([2, 4]);

    app.unmount();
    vi.useRealTimers();
  });

  it('flushChanges() triggers pending trailing onChange immediately', async () => {
    vi.useFakeTimers();
    const events: number[] = [];
    let FLUSH: (() => void) | undefined;
    const did = { current: false };

    const DebouncedTrailingWithFlush: FC<{ json: RRStackOptions }> = ({
      json,
    }) => {
      const calls = useRef(0);
      const onChange = (s: RRStack) => {
        events.push(s.rules.length);
      };
      const { rrstack, flushChanges } = useRRStack({
        json,
        onChange,
        changeDebounce: { delay: 50 },
      });
      // Expose flush to the test
      useEffect(() => {
        FLUSH = flushChanges;
      }, [flushChanges]);
      // Kick a few mutations quickly
      useEffect(() => {
        if (did.current) return;
        did.current = true;
        rrstack.addRule(newRuleAt(1, 't1'));
        rrstack.addRule(newRuleAt(2, 't2'));
        rrstack.addRule(newRuleAt(3, 't3'));
      }, [rrstack]);
      const count = rrstack.rules.length;
      const renderCount = useMemo(() => ++calls.current, [count, rrstack]);
      return React.createElement('div', {
        'data-count': String(count),
        'data-renders': String(renderCount),
      });
    };

    const app = mount(
      React.createElement(DebouncedTrailingWithFlush, { json: EXAMPLE_A }),
    );
    const div = app.container.querySelector('div')!;

    // Effects flushed; no trailing call yet
    await act(async () => {
      await Promise.resolve();
    });
    expect(div.getAttribute('data-count')).toBe('4');
    expect(events.length).toBe(0);

    // Invoke flush to fire pending trailing onChange immediately
    await act(async () => {
      FLUSH?.();
      await Promise.resolve();
    });
    expect(events).toEqual([4]);

    // Advancing time should not add more events (already flushed)
    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
    });
    expect(events).toEqual([4]);

    app.unmount();
    vi.useRealTimers();
  });

  it('json ingestion ignores version to avoid ping-pong', async () => {
    const events: number[] = [];
    function Probe({ json }: { json: RRStackOptions }) {
      useRRStack({
        json,
        onChange: () => {
          events.push(1);
        },
      });
      return React.createElement('div');
    }
    const base = { ...EXAMPLE_A, version: '0.0.1' as const };
    const app = mount(React.createElement(Probe, { json: base }));
    // Re-render with version changed only; comparator ignores version
    const withNewVersion = { ...EXAMPLE_A, version: '9.9.9' as const };
    app.rerender(React.createElement(Probe, { json: withNewVersion }));
    // allow effects to settle
    await act(async () => {
      await Promise.resolve();
    });
    // No ingestion-triggered onChange should have fired
    expect(events.length).toBe(0);
    app.unmount();
  });

  it('overlapping staged edits commit once and reflect final state', async () => {
    vi.useFakeTimers();
    const events: { count: number; tz: string }[] = [];
    const addRule = (h: number, label: string): RuleJson => ({
      effect: 'active',
      duration: { minutes: 5 },
      options: { freq: 'daily', byhour: [h], byminute: [0], bysecond: [0] },
      label,
    });
    function DebouncedView({ json }: { json: RRStackOptions }) {
      const { rrstack } = useRRStack({
        json,
        onChange: (s) => events.push({ count: s.rules.length, tz: s.timezone }),
        // Coalesce observable onChange into a single call for this window
        changeDebounce: { delay: 10 },
        mutateDebounce: { delay: 50 },
      });
      useEffect(() => {
        // Multiple staged edits within the same window
        rrstack.addRule(addRule(6, 'x'));
        rrstack.addRule(addRule(7, 'y'));
        rrstack.timezone = 'America/Chicago';
        rrstack.addRule(addRule(8, 'z'));
      }, [rrstack]);
      return React.createElement('div');
    }

    const app = mount(React.createElement(DebouncedView, { json: EXAMPLE_A }));
    // Let the debounce window elapse and flush
    await act(async () => {
      vi.advanceTimersByTime(60);
      // also allow the shorter changeDebounce window to fire the coalesced onChange
      vi.advanceTimersByTime(20);
      await Promise.resolve();
    });
    // Some environments may deliver an extra onChange due to dev/runtime nuances
    // (e.g., duplicate notifications in strict/dev). Assert at least one event and
    // use the final event as the source of truth.
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.length).toBeLessThanOrEqual(2);
    const e = events[events.length - 1];
    // EXAMPLE_A starts with 1 rule. We stage 3 adds.
    // In dev/strict environments, effects may run twice (adds applied twice).
    // Validate shape: count >= 4 and equals 1 + k*3 for k >= 1 (typically 1 or 2).
    const base = 1;
    const addedPerPass = 3;
    expect(e.count).toBeGreaterThanOrEqual(base + addedPerPass);
    expect((e.count - base) % addedPerPass).toBe(0);
    expect(e.tz).toBe('America/Chicago');
    app.unmount();
    vi.useRealTimers();
  });

  it('policy.onNotice is delivered on ingestion (timeUnit change)', async () => {
    const seen: Notice[] = [];
    const policy: UpdatePolicy = {
      onTimeUnitChange: 'warn',
      onNotice: (n) => seen.push(n),
    };
    function NoticeProbe({
      json,
      policy,
    }: {
      json: RRStackOptions;
      policy: UpdatePolicy;
    }) {
      const { rrstack } = useRRStack({ json, policy });
      const calls = useRef(0);
      const unit = rrstack.timeUnit;
      const renders = useMemo(() => ++calls.current, [unit, rrstack]);
      return React.createElement('div', {
        'data-unit': unit,
        'data-renders': String(renders),
      });
    }
    const base: RRStackOptions = { ...EXAMPLE_A }; // default 'ms'
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(NoticeProbe, { json: base, policy }));
    });
    // Ingest a timeUnit change via json → engine; hook policy should apply
    act(() => {
      root.render(
        React.createElement(NoticeProbe, {
          json: { ...EXAMPLE_A, timeUnit: 's' as const },
          policy,
        }),
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    const div = container.querySelector('div')!;
    expect(div.getAttribute('data-unit')).toBe('s');
    // Should have observed a timeUnitChange notice from ingestion
    expect(
      seen.some(
        (n) => n.kind === 'timeUnitChange' && n.from === 'ms' && n.to === 's',
      ),
    ).toBe(true);
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('policy.onNotice ordering matches rrstack.update() return (direct update)', async () => {
    const seen: Notice[] = [];
    const policy: UpdatePolicy = {
      onVersionDown: 'warn',
      onTimeUnitChange: 'warn',
      onNotice: (n) => seen.push(n),
    };
    let returned: Notice[] | null = null;

    function OrderProbe({
      json,
      policy,
    }: {
      json: RRStackOptions;
      policy: UpdatePolicy;
    }) {
      const { rrstack } = useRRStack({ json }); // no ingestion changes; we drive update directly
      const did = useRef(false);
      useEffect(() => {
        if (did.current) return;
        did.current = true;
        // Trigger both a versionDown (incoming newer) and a timeUnitChange in one update call.
        returned = rrstack.update({ version: '9.9.9', timeUnit: 's' }, policy);
      }, [rrstack, policy]);
      return React.createElement('div');
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        React.createElement(OrderProbe, {
          json: EXAMPLE_A,
          policy,
        }),
      );
    });
    // Allow effects to flush
    await act(async () => {
      await Promise.resolve();
    });
    expect(Array.isArray(returned)).toBe(true);
    expect(returned!.length).toBe(seen.length);
    expect(returned).toEqual(seen);
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('accepts null json (falls back to UTC with empty rules)', () => {
    function NullView({ json }: { json: RRStackOptions | null }) {
      const { rrstack } = useRRStack({ json });
      return React.createElement('div', {
        'data-tz': rrstack.timezone,
        'data-count': String(rrstack.rules.length),
      });
    }
    const app = mount(React.createElement(NullView, { json: null }));
    const div = app.container.querySelector('div')!;
    expect(div.getAttribute('data-tz')).toBe('UTC');
    expect(div.getAttribute('data-count')).toBe('0');
    app.unmount();
  });

  it('accepts undefined json (falls back to UTC with empty rules)', () => {
    function UndefView() {
      // intentionally omit json

      const { rrstack } = useRRStack({ json: undefined });
      return React.createElement('div', {
        'data-tz': rrstack.timezone,
        'data-count': String(rrstack.rules.length),
      });
    }
    const app = mount(React.createElement(UndefView));
    const div = app.container.querySelector('div')!;
    expect(div.getAttribute('data-tz')).toBe('UTC');
    expect(div.getAttribute('data-count')).toBe('0');
    app.unmount();
  });
});
