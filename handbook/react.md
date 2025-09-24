---
title: React
---

# React hooks

Subpath export: `@karmaniverous/rrstack/react`

Two small hooks that observe a live RRStack instance without re‑wrapping its
control surface. RRStack remains the single source of truth: you call its
methods directly; the hooks subscribe to its post‑mutation notifications.

## Install / import

```ts
import { useRRStack, useRRStackSelector } from '@karmaniverous/rrstack/react';
import type { RRStack, RRStackOptions } from '@karmaniverous/rrstack';
```

## useRRStack

Create (or reset) and observe a live RRStack instance from JSON, with optional
debounced change notifications. Advanced options allow debouncing how edits are
applied to RRStack and how renders are coalesced:

- applyDebounce: coalesce frequent UI → rrstack.updateOptions calls.
- renderDebounce: coalesce version bumps (rrstack → UI) to reduce repaint churn.
- debounce: existing autosave/onChange debounce (outbound).

Signature

```ts
function useRRStack(
  json: RRStackOptions,
  onChange?: (s: RRStack) => void,
  opts?: {
    resetKey?: string | number;
    debounce?:
      | number
      | { delay: number; leading?: boolean; trailing?: boolean };
    applyDebounce?:
      | number
      | { delay: number; leading?: boolean; trailing?: boolean };
    renderDebounce?:
      | number
      | { delay: number; leading?: boolean; trailing?: boolean };
    logger?:
      | boolean
      | ((e: {
          type: 'init' | 'reset' | 'mutate' | 'flush';
          rrstack: RRStack;
        }) => void);
  },
): {
  rrstack: RRStack;
  version: number;
  flush: () => void; // autosave flush
  apply: (p: { timezone?: string; rules?: RuleJson[] }) => void;
  flushApply: () => void; // applyDebounce flush
  flushRender: () => void; // renderDebounce flush
};
```

Parameters

- `json: RRStackOptions` — JSON input for the stack (same shape as
  `new RRStack(opts)`). A new instance is only created when `resetKey` changes.
- `onChange?: (s: RRStack) => void` — optional callback fired after successful
  mutations (post‑compile). The constructor does not trigger this callback.
- `opts?:` options
  - `resetKey?: string | number` — change to intentionally rebuild the instance
    (e.g., switching documents).
  - `applyDebounce?: number | { delay: number; leading?: boolean; trailing?: boolean }`
    — coalesce frequent `rrstack.updateOptions` calls (UI → rrstack).
  - `renderDebounce?: number | { delay: number; leading?: boolean; trailing?: boolean }`
    — coalesce version bumps from rrstack notifications (rrstack → UI).
  - `debounce?: number | { delay: number; leading?: boolean; trailing?: boolean }`
    - number shorthand = `{ delay, leading: false, trailing: true }`.
    - `leading` fires immediately at the start of a burst.
    - `trailing` fires once after a quiet period (recommended for autosave).
    - `flush()` emits any pending trailing call immediately.
  - `logger?: boolean | (e) => void` — `true` logs basic events via
    `console.debug`; a function receives `{ type, rrstack }`.

Returns

- `rrstack: RRStack` — the live instance (stable until `resetKey` changes)
- `version: number` — increments after (debounced) renders; use to memoize heavy derived values
- `flush(): void` — flush pending trailing `onChange` (autosave)
- `apply(p): void` — apply `{ timezone?, rules? }` to rrstack, debounced per `applyDebounce`
- `flushApply(): void` — flush pending trailing applies immediately
- `flushRender(): void` — flush pending render debounce (force a paint)

Behavior notes

- The hook subscribes to RRStack notifications and schedules the debounced
  `onChange` before notifying React. This guarantees that `flush()` can see a
  pending trailing call in tests and UIs (including fake‑timer environments).
- Debounce state is stable across renders; pending trailing calls persist until
  delivered or flushed.
- RRStack core stays synchronous; debouncing is purely in the hook. `applyDebounce`
  can lag rrstack behind form inputs for the debounce window; call `flushApply()`
  when you need rrstack current (e.g., Save). `renderDebounce` reduces repaint
  churn; `flushRender()` forces an immediate render when needed (e.g., preview).

Example (debounced autosave + “save now”)

```tsx
function Editor({ json, docId }: { json: RRStackOptions; docId: string }) {
  const onChange = (s: RRStack) => {
    // autosave (debounced by the hook if configured)
    void saveToServer(docId, s.toJson());
  };
  const { rrstack, version, flush } = useRRStack(json, onChange, {
    resetKey: docId,
    debounce: { delay: 500, trailing: true }, // final-state saves
    logger: true, // console.debug
  });

  // use version to memoize heavy derived values
  // e.g., segments over a long window

  return (
    <div>
      <button onClick={() => rrstack.addRule(/*...*/)}>Add rule</button>
      <button
        onClick={() => {
          flush();
          void saveToServer(docId, rrstack.toJson());
        }}
      >
        Save now
      </button>
      <div>Rules: {rrstack.rules.length}</div>
    </div>
  );
}
```

Leading‑only example

```tsx
const { rrstack } = useRRStack(json, onChange, {
  debounce: { delay: 200, leading: true, trailing: false },
});
```

Apply/render debounces example

```tsx
function Editor({
  json,
  docId,
  save,
}: {
  json: RRStackOptions;
  docId: string;
  save: (j: RRStackOptions) => Promise<void>;
}) {
  const onChange = (s: RRStack) => {
    void save(s.toJson());
  };
  const { rrstack, apply, flush, flushApply, flushRender } = useRRStack(
    json,
    onChange,
    {
      resetKey: docId,
      debounce: { delay: 600, trailing: true }, // autosave
      applyDebounce: { delay: 150, trailing: true }, // UI → rrstack
      renderDebounce: { delay: 50, leading: true }, // rrstack → UI
    },
  );

  const onFormChange = (p: { timezone?: string; rules?: RuleJson[] }) =>
    apply(p);

  return (
    <div>
      <button
        onClick={() => {
          flushApply();
          flush();
        }}
      >
        Save now
      </button>
      <button
        onClick={() => {
          flushRender();
        }}
      >
        Force paint
      </button>
      <HookFormRRStack rrstackJson={rrstack.toJson()} onChange={onFormChange} />
    </div>
  );
}
```

## useRRStackSelector

Subscribe to an RRStack‑derived value. The selector recomputes on RRStack
mutations, and the component only re‑renders when `isEqual` deems the derived
value changed (default `Object.is`).

```ts
function useRRStackSelector<T>(  rrstack: RRStack,  selector: (s: RRStack) => T,  isEqual?: (a: T, b: T) => boolean, // default Object.is): T;
```

Parameters

- `rrstack: RRStack` — the live instance from `useRRStack`.
- `selector: (s) => T` — computes the derived value.
- `isEqual?: (a, b) => boolean` — equality check to suppress re‑renders;
  default is `Object.is`.

Returns

- `T` — the derived value, updated when RRStack mutates and `isEqual` returns
  false for the new vs prior value.

Example

```tsx
function RuleCount({ json }: { json: RRStackOptions }) {
  const { rrstack } = useRRStack(json);
  const count = useRRStackSelector(rrstack, (s) => s.rules.length);
  return <span>{count}</span>;
}
```

## Notes & tips

- Hooks subscribe to RRStack notifications (fired post‑mutation). RRStack
  remains the single source of truth; call its methods directly.
- For long windows, prefer chunking (day/week) or a Worker for heavy sweeps.
- In tests using fake timers, call `flush()` inside `act(async () => { ... })`
  and await a microtask to flush effects.
