---
title: Configuration & update()
---

# Configuration & update()

This page covers how to configure a stack (timezone, rules, baseline), how time units work (including rounding), and how the `update()` pipeline handles versions and time‑unit changes with notices.

## RRStackOptions (constructor input / toJson output)

```ts
export interface RRStackOptions {
  version?: string; // ignored by constructor; written by toJson()
  timezone: string; // IANA time zone (validated at runtime)
  timeUnit?: 'ms' | 's'; // default 'ms'
  defaultEffect?: 'active' | 'blackout' | 'auto'; // default 'auto'
  rules?: RuleJson[]; // default []
}
```

- `timezone`: All coverage is computed in this IANA zone (DST‑aware).
- `timeUnit`:
  - `'ms'` — millisecond timestamps for inputs/outputs.
  - `'s'` — integer seconds; ends are rounded up (see below).
- `defaultEffect` (baseline):
  - Behaves like a virtual, open‑ended span rule prepended to the cascade:
    - `'auto'` (default): opposite of the first rule’s effect, or `'active'` if no rules.
    - `'active' | 'blackout'`: use exactly that baseline anywhere uncovered.
  - Applies uniformly to `isActiveAt`, `getSegments`, `classifyRange`, `getEffectiveBounds`.

See all rule shapes in [Core API and Types](./api.md#types-selected).

## Time units and rounding

- RRStack operates end‑to‑end in the configured unit.
- Intervals are half‑open: `[start, end)`.
- Seconds mode (`'s'`):
  - Occurrence ends are rounded up to the next integer second to avoid boundary false negatives at segment boundaries.
  - All helper functions that return instants in `'s'` mode return integer seconds (via truncation for conversions; via rounding up for occurrence end).

## update() and notices

Use `update()` to ingest changes to timezone/rules/timeUnit and to run the version pipeline. It returns an array of `Notice` and also calls `policy.onNotice` for each.

```ts
const policy = {
  onVersionDown: 'warn',
  onTimeUnitChange: 'warn',
  onNotice: console.info,
};
const notices = stack.update(incomingJson, policy);
```

### Version pipeline

- Engine version (current RRStack build) is written by `toJson()` and used for comparisons.
- Incoming `version` may be older, newer, or invalid:

Defaults:

- `onVersionUp` (incoming older than engine): `'off'` (accept; upgrader runs, currently no‑op).
- `onVersionDown` (incoming newer): `'error'` (reject; set `'warn'`/`'off'` to accept “as current”).
- `onVersionInvalid` (invalid semver): `'error'` (reject; set `'warn'`/`'off'` to accept “as current”).

Actions:

- Accept and upgrade (no‑op today).
- Reject with an error (throws).
- Ingest “as current” (treat as engine version for this update).

### Time‑unit changes

When `timeUnit` changes:

- If `rules` are provided in the same update:
  - Replace the entire rules array. Those rules are assumed to already be expressed in the new unit (no conversion).
- If `rules` are not provided:
  - Retained rules’ clamp timestamps (`options.starts`/`options.ends`) are converted:
    - ms → s: `Math.trunc(ms / 1000)`
    - s → ms: `s * 1000`
- Recompile exactly once on success; a `'timeUnitChange'` notice is produced (policy default `'warn'`).

### Notice shape

```ts
type Notice =
  | { kind: 'versionUp' | 'versionDown' | 'versionInvalid'; ... }
  | { kind: 'timeUnitChange'; ... }
```

See the full union and `UpdatePolicy` options in [Core API and Types](./api.md#notices-and-updatepolicy).

## Baseline (defaultEffect)

- `'auto'` (default): behaves like a virtual open‑ended span whose effect is the opposite of the first real rule, or `'active'` if there are no rules.
- `'active' | 'blackout'`: use exactly that effect where no rule covers.

Implications:

- Point queries (`isActiveAt`) and streams (`getSegments`) seamlessly include baseline coverage.
- `classifyRange` reflects baseline coverage appropriately (e.g., “active” when the entire window is uncovered but baseline is `'active'`).
- `getEffectiveBounds` returns open‑sided bounds for open‑ended baseline coverage.

## Domain bounds

- Domain minimum: `0` (in the configured unit).
- Domain maximum: a very large bound (approximate JS Date max; unit dependent).
- Used for open spans and guard checks; not intended for scanning far into the future.

## Worked examples

### Accept newer config with a warning and log notices

```ts
const seen: Notice[] = [];
const policy: UpdatePolicy = {
  onVersionDown: 'warn',
  onNotice: (n) => seen.push(n),
};

const notices = stack.update({ version: '999.0.0' }, policy);
// both arrays contain 'versionDown' with action 'ingestAsCurrent'
```

### Switch to seconds while retaining existing rules

```ts
// Clamps on retained rules convert ms → s (trunc)
stack.update({ timeUnit: 's' }, { onTimeUnitChange: 'warn' });
```

### Replace rules while switching unit

```ts
const rulesInSeconds = [
  { effect: 'active', options: { starts: 1_700_000_000, ends: 1_700_000_600 } },
];

stack.update(
  { timeUnit: 's', rules: rulesInSeconds },
  { onTimeUnitChange: 'warn' },
);
```

## See also

- Public types: [Core API and Types](./api.md)
- Algorithms for bounds and coverage: [Algorithms (deep dive)](./algorithms.md)
- Validate config with JSON Schema: [JSON Schema & validation](./json-schema.md)
