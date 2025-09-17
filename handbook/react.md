# React hooks

Subpath export: `@karmaniverous/rrstack/react`

Two tiny hooks that observe a live RRStack instance without re‑wrapping its
control surface.

## useRRStack

```ts
import { useRRStack } from '@karmaniverous/rrstack/react';
import type { RRStack, RRStackOptions } from '@karmaniverous/rrstack';

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

Options

- `resetKey?: string | number` — when it changes, the hook creates a fresh
  RRStack from `json` (for switching records/documents).
- `debounce?: number | { delay: number; leading?: boolean; trailing?: boolean }`
  - `leading` fires immediately at the start of a burst;
  - `trailing` fires once after no calls for `delay` ms (recommended for autosave).
  - `flush()` triggers any pending trailing call immediately.
- `logger?: boolean | (e) => void` — `true` logs basic mutate/init/reset/flush
  events to the console; a function receives `{ type, rrstack }`.

## useRRStackSelector

Memoize a derived value that recomputes on RRStack mutations and only triggers
re-render when `isEqual` deems it changed.

```ts
import { useRRStack, useRRStackSelector } from '@karmaniverous/rrstack/react';

function RuleCount({ json }: { json: RRStackOptions }) {
  const { rrstack } = useRRStack(json);
  const count = useRRStackSelector(rrstack, (s) => s.rules.length);
  return <span>{count}</span>;
}
```

Signature

```ts
useRRStackSelector<T>(
  rrstack: RRStack,
  selector: (s: RRStack) => T,
  isEqual?: (a: T, b: T) => boolean, // default Object.is
): T;
```

## Notes

- The hooks subscribe to RRStack notifications (fired post‑mutation). RRStack
  itself remains the single source of truth; call its methods directly.
- For long windows, prefer chunking (day/week) or a Worker for heavy sweeps.
```
