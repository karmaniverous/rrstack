---
title: React
---

# React hooks

Subpath export: `@karmaniverous/rrstack/react`

Two hooks observe a live RRStack instance without re‑wrapping its control surface. RRStack remains the single source of truth: you call its methods directly; the hooks subscribe to post‑mutation notifications.

## useRRStack

Create (or reset) and observe a live RRStack instance from JSON, with optional debounced change notifications. Advanced options allow debouncing how edits are applied to RRStack and how renders are coalesced:

```ts
function useRRStack(props: {
  json: RRStackOptions | null | undefined;
  onChange?: (s: RRStack) => void;
  resetKey?: string | number;
  policy?: UpdatePolicy;
  changeDebounce?: true | number | { delay?: number; leading?: boolean };
  mutateDebounce?: true | number | { delay?: number; leading?: boolean };
  renderDebounce?: true | number | { delay?: number; leading?: boolean };
  logger?: boolean | ((e: { type: LogEventType; rrstack: RRStack }) => void);
}): {
  rrstack: RRStack; // façade (proxy)
  version: number;
  flushChanges(): void;
  flushMutations(): void;
  cancelMutations(): void;
  flushRender(): void;
};
```

Highlights

- `policy?: UpdatePolicy` is applied to both:
  - Prop ingestion (`json` → `rrstack.update(json, policy)`), and
  - Staged commits (rules/timezone via `rrstack.update(patch, policy)`).
- Staged vs compiled:
  - `rrstack.rules`/`rrstack.timezone` (and `rrstack.toJson()`) reflect staged values before commit.
  - Queries (`isActiveAt`, `getSegments`, etc.) reflect the last committed compile until commit.

## useRRStackSelector

Subscribe to an RRStack‑derived value. The selector recomputes on RRStack mutations and the component only re‑renders when `isEqual` deems the derived value changed.

```ts
function useRRStackSelector<T>(props: {
  rrstack: RRStack;
  selector: (s: RRStack) => T;
  isEqual?: (a: T, b: T) => boolean; // default Object.is
  renderDebounce?: true | number | { delay?: number; leading?: boolean };
  logger?: boolean | ((e: { type: LogEventType; rrstack: RRStack }) => void);
  resetKey?: string | number;
}): {
  selection: T;
  version: number;
  flushRender(): void;
};
```

## Debounce knobs

- `changeDebounce`: coalesce autosave (`onChange`).
- `mutateDebounce`: stage frequent UI edits and commit once per window (optional leading immediate commit).
- `renderDebounce`: coalesce paints (optional leading immediate paint).

For code examples and testing tips, see the repository tests and the [API Reference](https://docs.karmanivero.us/rrstack).
