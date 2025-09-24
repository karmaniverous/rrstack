---
title: React
---

# React hooks
Subpath export: `@karmaniverous/rrstack/react`

Two small hooks observe a live RRStack instance without re‑wrapping its control surface. RRStack
remains the single source of truth: you call its methods directly; the hooks subscribe to its
post‑mutation notifications.

## Install / import

```ts
import { useRRStack, useRRStackSelector } from '@karmaniverous/rrstack/react';
import type { RRStack, RRStackOptions } from '@karmaniverous/rrstack';
```

## useRRStack
Create (or reset) and observe a live RRStack instance from JSON, with optional debounced change
notifications. Advanced options allow debouncing how edits are applied to RRStack and how renders
are coalesced:

- mutateDebounce: coalesce frequent UI → rrstack edits (staged + commit).
- renderDebounce: coalesce version bumps (rrstack → UI) to reduce repaint churn (optional leading).
- changeDebounce: autosave/onChange debounce (always trailing).

Signature

```ts
function useRRStack(
  json: RRStackOptions,
  onChange?: (s: RRStack) => void,
  opts?: {
    resetKey?: string | number;
    changeDebounce?: true | number | { delay?: number; leading?: boolean };
    mutateDebounce?: true | number | { delay?: number; leading?: boolean };
    renderDebounce?: true | number | { delay?: number; leading?: boolean };
    logger?:
      | boolean
      | ((e: {
          type:
            | 'init'
            | 'reset'
            | 'mutate'
            | 'commit'
            | 'flushChanges'
            | 'flushMutations'
            | 'flushRender'
            | 'cancel';
          rrstack: RRStack;
        }) => void);
  },
): {
  rrstack: RRStack; // façade (proxy)
  version: number;
  flushChanges: () => void;
  flushMutations: () => void;
  cancelMutations: () => void;
  flushRender: () => void;
};
```

Hook options and outputs (quick reference)

- Options
  - resetKey: string | number
    - Recreate the RRStack instance intentionally when this value changes (e.g., switching documents).
  - changeDebounce: true | number | { delay?: number; leading?: boolean }
    - Debounce autosave/onChange; trailing is always true. true = default delay; number = ms delay.
  - mutateDebounce: true | number | { delay?: number; leading?: boolean }
    - Debounce UI → rrstack edits. Edits to rrstack.rules/timezone are staged and committed once per window.
  - renderDebounce: true | number | { delay?: number; leading?: boolean }
    - Debounce rrstack → UI paints by coalescing version bumps; final trailing paint always occurs.
  - logger: boolean | (e: { type: LogEvent; rrstack: RRStack }) => void
    - true logs to console.debug; function receives structured events.
- Outputs
  - rrstack: RRStack (façade)
  - version: number (incremented on debounced render); use as a memo key for heavy derivations.
  - flushChanges(): void; flushMutations(): void; cancelMutations(): void; flushRender(): void

Parameters

- `json: RRStackOptions` — JSON input for the stack (same shape as
  `new RRStack(opts)`). A new instance is only created when `resetKey` changes.- `onChange?: (s: RRStack) => void` — optional callback fired after successful
  mutations (post‑compile). The constructor does not trigger this callback.
- `opts?:` options
  - `resetKey?: string | number` — change to intentionally rebuild the instance
    (e.g., switching documents).
  - `changeDebounce?: true | number | { delay?: number; leading?: boolean }` — autosave debounce.
  - `mutateDebounce?: true | number | { delay?: number; leading?: boolean }` — coalesce UI edits
    into a single commit per window (staged rules/timezone).
  - `renderDebounce?: true | number | { delay?: number; leading?: boolean }` — coalesce version
    bumps (rrstack → UI).
  - `logger?: boolean | (e) => void` — `true` logs basic events via
    `console.debug`; a function receives `{ type, rrstack }`.

Returns

- `rrstack: RRStack` — façade (proxy) overlaying staged `rules/timezone` and intercepting mutators.
- `version: number` — increments after (debounced) renders; use to memoize heavy derived values.
- `flushChanges(): void` — flush pending trailing `onChange` (autosave).
- `flushMutations(): void` — commit staged edits immediately.
- `cancelMutations(): void` — discard staged edits.
- `flushRender(): void` — flush pending render debounce (force a paint).

Behavior notes

- The hook subscribes to RRStack notifications and schedules the debounced `onChange` before
  notifying React, so `flushChanges()` can observe a pending trailing call (including with
  fake timers).
- Debounce state is stable across renders; pending trailing calls persist until delivered or flushed.
- RRStack core stays synchronous; debouncing is purely in the hook. `mutateDebounce` stages edits
  and commits once per window. Call `flushMutations()` when you need rrstack current (e.g., Save).
  `renderDebounce` reduces repaint churn; `flushRender()` forces an immediate render when needed
  (e.g., preview).

Example (debounced autosave + “save now”)

```tsx
function Editor({ json, docId }: { json: RRStackOptions; docId: string }) {
  const onChange = (s: RRStack) => {
    // autosave (debounced by the hook if configured)
    void saveToServer(docId, s.toJson());
  };
  const { rrstack, version, flushChanges } = useRRStack(json, onChange, {
    resetKey: docId,
    changeDebounce: 600, // autosave (trailing)
    logger: true,
  });

  // use version to memoize heavy derived values
  // e.g., segments over a long window

  return (
    <div>
      <button onClick={() => rrstack.addRule(/*...*/)}>Add rule</button>
      <button
        onClick={() => {
          flushChanges();
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

Leading example

```tsx
const { rrstack } = useRRStack(json, onChange, {
  changeDebounce: { delay: 200, leading: true },
});
```

Mutate/render debounces example

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
  const {
    rrstack,
    flushChanges,
    flushMutations,
    cancelMutations,
    flushRender,
  } = useRRStack(json, onChange, {
    resetKey: docId,
    changeDebounce: 600, // autosave (trailing)
    mutateDebounce: { delay: 150, leading: true }, // UI → rrstack
    renderDebounce: { delay: 50, leading: true }, // rrstack → UI
  });

  // Example: stage edits quickly from a form
  // rrstack.updateOptions({ rules: nextRules });

  return (
    <div>
      <button
        onClick={() => {
          flushMutations();
          flushChanges();
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
      {/* Provide staged values to your form via rrstack.rules/timezone */}
      {/* rrstack.toJson() overlays staged values as well */}
    </div>
  );
}
```

## Debounced form controls

These patterns show how to wire form inputs to RRStack with minimal repaint churn and clean autosave behavior. In both cases, the hook’s mutateDebounce stages edits on the way in and commits once per window; changeDebounce coalesces autosave calls on the way out.

Notes

- Reads of rrstack.rules/rrstack.timezone (and rrstack.toJson()) reflect staged values prior to commit; queries still use the last committed compiled state until the commit occurs.
- For Save now buttons, call flushMutations() then flushChanges() to ensure the latest staged edits are committed and autosaved immediately.

### Uncontrolled input (debounced, simple)

Use defaultValue and onInput to keep the input decoupled from React state. Assign directly to rrstack — the façade stages and commits via mutateDebounce.

```tsx
import { useEffect, useRef } from 'react';
import { useRRStack } from '@karmaniverous/rrstack/react';
import type { RRStack, RRStackOptions } from '@karmaniverous/rrstack';

async function saveToServer(json: RRStackOptions) {
  // your persistence
}

export function TimeZoneFieldUncontrolled({ json }: { json: RRStackOptions }) {
  const { rrstack, flushMutations, flushChanges } = useRRStack(
    json,
    (s: RRStack) => {
      // autosave (debounced by changeDebounce)
      void saveToServer(s.toJson());
    },
    {
      changeDebounce: 600, // autosave debounce (trailing)
      mutateDebounce: 150, // stage + commit tz/rules once per window
      // optional: renderDebounce: { delay: 50, leading: true },
    },
  );

  const ref = useRef<HTMLInputElement>(null);

  // Keep the uncontrolled input in sync when the source switches (e.g., resetKey) or tz changes externally.
  useEffect(() => {
    if (ref.current) ref.current.value = rrstack.timezone;
  }, [rrstack, rrstack.timezone]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Ensure latest staged value is committed and autosaved immediately
        flushMutations();
        flushChanges();
      }}
    >
      <label>
        Time zone (uncontrolled):
        <input
          ref={ref}
          name="tz"
          defaultValue={rrstack.timezone}
          onInput={(e) => {
            const next = (e.currentTarget as HTMLInputElement).value;
            // UI → rrstack staging; commit is debounced by mutateDebounce
            rrstack.timezone = next;
          }}
        />
      </label>
      <button type="submit">Save now</button>
    </form>
  );
}
```

Why uncontrolled here?

- Keeps the input snappy without coupling keystrokes to React state.
- rrstack’s façade provides the “model” value; mutateDebounce stages updates efficiently.

### Controlled input (debounced, local state)

Use React state when you need validation, transformation, or dependent UI. Still assign to rrstack on each change — commit is debounced.

```tsx
import { useEffect, useState } from 'react';
import { useRRStack } from '@karmaniverous/rrstack/react';
import type { RRStack, RRStackOptions } from '@karmaniverous/rrstack';

async function saveToServer(json: RRStackOptions) {
  // your persistence
}

export function TimeZoneFieldControlled({ json }: { json: RRStackOptions }) {
  const { rrstack, flushMutations, cancelMutations, flushChanges } = useRRStack(
    json,
    (s: RRStack) => {
      void saveToServer(s.toJson());
    },
    {
      changeDebounce: { delay: 600 }, // autosave (trailing)
      mutateDebounce: { delay: 200, leading: true }, // immediate first commit, then trailing
      renderDebounce: { delay: 50, leading: true }, // reduce repaint churn
    },
  );

  const [tz, setTz] = useState(rrstack.timezone);

  // Re-sync when the underlying instance resets or external mutations occur.
  useEffect(() => {
    setTz(rrstack.timezone);
  }, [rrstack, rrstack.timezone]);

  return (
    <div>
      <label>
        Time zone (controlled):
        <input
          value={tz}
          onChange={(e) => {
            const next = e.currentTarget.value;
            setTz(next); // local echo
            rrstack.timezone = next; // staged; commit debounced by mutateDebounce
          }}
          onBlur={() => {
            // Make sure a final commit/autosave happens on exit
            flushMutations();
            flushChanges();
          }}
        />
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => {
            flushMutations();
            flushChanges();
          }}
        >
          Save now
        </button>
        <button
          onClick={() => {
            cancelMutations(); // discard staged edits
            setTz(rrstack.timezone); // reset local echo
          }}
        >
          Revert pending
        </button>
      </div>
    </div>
  );
}
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

```tsx
function RuleCount({ json }: { json: RRStackOptions }) {
  const { rrstack } = useRRStack(json);
  const count = useRRStackSelector(rrstack, (s) => s.rules.length);
  return <span>{count}</span>;
}
```

## Notes & tips

- Hooks subscribe to RRStack notifications (fired post‑mutation). RRStack remains the single source
  of truth; call its methods directly.
- For long windows, prefer chunking (day/week) or a Worker for heavy sweeps.
- In tests using fake timers, call `flushChanges()` and/or `flushMutations()` inside
  `act(async () => { ... })` and await a microtask to flush effects.