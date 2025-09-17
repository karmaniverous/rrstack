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
debounced change notifications.

Signature

```ts
function useRRStack(
  json: RRStackOptions,
  onChange?: (s: RRStack) => void,
  opts?: {
    resetKey?: string | number;
    debounce?: number | { delay: number; leading?: boolean; trailing?: boolean };
    logger?: boolean | ((e: { type: 'init' | 'reset' | 'mutate' | 'flush'; rrstack: RRStack }) => void);
  },
): { rrstack: RRStack; version: number; flush: () => void };
```

Parameters

- `json: RRStackOptions` — JSON input for the stack (same shape as
  `new RRStack(opts)`). A new instance is only created when `resetKey` changes.
- `onChange?: (s: RRStack) => void` — optional callback fired after successful
  mutations (post‑compile). The constructor does not trigger this callback.
- `opts?:` options
  - `resetKey?: string | number` — change to intentionally rebuild the instance
    (e.g., switching documents).
  - `debounce?: number | { delay: number; leading?: boolean; trailing?: boolean }`
    - number shorthand = `{ delay, leading: false, trailing: true }`.
    - `leading` fires immediately at the start of a burst.
    - `trailing` fires once after a quiet period (recommended for autosave).
    - `flush()` emits any pending trailing call immediately.
  - `logger?: boolean | (e) => void` — `true` logs basic events via
    `console.debug`; a function receives `{ type, rrstack }`.

Returns

- `rrstack: RRStack` — the live instance (stable until `resetKey` changes).
- `version: number` — monotonically increments after each mutation; use to
  memoize heavy derived values (segments, etc.).
- `flush(): void` — if a trailing debounced `onChange` is pending, emit it now
  (no‑op otherwise).

Behavior notes

- The hook subscribes to RRStack notifications and schedules the debounced
  `onChange` before notifying React. This guarantees that `flush()` can see a
  pending trailing call in tests and UIs (including fake‑timer environments).
- Debounce state is stable across renders; pending trailing calls persist until
  delivered or flushed.

Example (debounced autosave + “save now”)

```tsx
function Editor({ json, docId }: { json: RRStackOptions; docId: string }) {
  const onChange = (s: RRStack) => {
    // autosave (can be debounced by the hook)
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
      <button onClick={() => { flush(); void saveToServer(docId, rrstack.toJson()); }}>
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

## useRRStackSelector

Subscribe to an RRStack‑derived value. The selector recomputes on RRStack
mutations, and the component only re‑renders when `isEqual` deems the derived
value changed (default `Object.is`).

```ts
function useRRStackSelector<T>(
  rrstack: RRStack,
  selector: (s: RRStack) => T,
  isEqual?: (a: T, b: T) => boolean, // default Object.is
): T;
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

