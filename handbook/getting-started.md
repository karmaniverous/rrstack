---
title: Getting started
---

# Getting started

This guide shows how to install RRStack, define rules, query coverage, and persist configuration. For a concise list of methods and types, see [Core API and Types](./api.md).

## Install

```bash
npm install @karmaniverous/rrstack
# or
yarn add @karmaniverous/rrstack
# or
pnpm add @karmaniverous/rrstack
```

## Define rules and build a stack

```ts
import { RRStack } from '@karmaniverous/rrstack';

// Daily 05:00–06:00 active
const active = {
  effect: 'active' as const,
  duration: { hours: 1 },
  options: {
    freq: 'daily' as const,
    byhour: [5],
    byminute: [0],
    bysecond: [0],
  },
};

// Blackout slice 05:30–05:45 (overlays the active slice)
const blackout = {
  effect: 'blackout' as const,
  duration: { minutes: 15 },
  options: {
    freq: 'daily' as const,
    byhour: [5],
    byminute: [30],
    bysecond: [0],
  },
};

const stack = new RRStack({
  timezone: 'America/Chicago',
  rules: [active, blackout],
});
```

Tips

- Later rules override earlier ones at covered instants (last‑wins).
- You can mix recurring rules and continuous spans (omit `options.freq` to declare a span).

## Point query (active now?)

```ts
const now = Date.now();
const isActive = stack.isActiveAt(now); // boolean
```

## Stream segments (half‑open)

```ts
const from = Date.UTC(2024, 0, 2, 5, 0, 0);
const to = Date.UTC(2024, 0, 2, 6, 0, 0);

for (const seg of stack.getSegments(from, to)) {
  // { start: number; end: number; status: 'active' | 'blackout' }
}
```

- Intervals are half‑open: `[start, end)`.
- In `'s'` (seconds) mode, end times are rounded up to the next integer second.

## Classify a window

```ts
const status = stack.classifyRange(from, to);
// 'active' | 'blackout' | 'partial'
```

## Effective bounds

```ts
const b = stack.getEffectiveBounds();
// { start?: number; end?: number; empty: boolean }
```

- `start` omitted for open‑start coverage already active at the domain minimum.
- `end` omitted for open‑ended coverage.
- `empty: true` means “no active coverage exists”.

## Persist / restore

```ts
const json = stack.toJson(); // round-trippable configuration (with version)
const again = new RRStack(json);
```

## Continuous (span) rules

Not every schedule needs a recurrence. Omit `options.freq` to declare a span rule:

```ts
const span = {
  effect: 'active' as const,
  // duration omitted
  options: {
    starts: Date.UTC(2024, 0, 10, 5, 0, 0),
    ends: Date.UTC(2024, 0, 10, 7, 0, 0),
  },
};
```

Coverage is continuous across `[starts, ends)`; either side may be open.

## Events (recurring and one‑time)

Event rules represent zero‑duration instants rather than coverage windows. They participate in the cascade: an event that falls inside a blackout window is suppressed.

```ts
// Recurring event: daily at 09:00
const alarm = {
  effect: 'event' as const,
  options: {
    freq: 'daily' as const,
    byhour: [9],
    byminute: [0],
    bysecond: [0],
  },
  label: 'morning-alarm',
};

// One-time event (no freq, just a timestamp)
const deadline = {
  effect: 'event' as const,
  options: { starts: Date.UTC(2024, 5, 1, 17, 0, 0) },
  label: 'project-deadline',
};

const stack = new RRStack({
  timezone: 'America/Chicago',
  rules: [alarm, deadline],
});
```

### Enumerate events in a window

```ts
const from = Date.UTC(2024, 0, 10);
const to = Date.UTC(2024, 0, 11);

for (const evt of stack.getEvents(from, to)) {
  // { at: number; label?: string }
}
```

### Next upcoming event

```ts
const next = stack.nextEvent(); // from now, 366-day look-ahead
// { at: number; label?: string } | undefined

// Or from a specific time with a custom look-ahead
const next2 = stack.nextEvent(Date.UTC(2024, 0, 10), 7 * 24 * 3600 * 1000);
```

Tips

- Events do not affect coverage queries (`isActiveAt`, `getSegments`, `classifyRange`, `getEffectiveBounds`).
- Events suppressed by blackout coverage are excluded from `getEvents` and `nextEvent`.
- Event rules must not have a `duration`.

## Baseline (defaultEffect)

RRStack behaves as if a virtual, open‑ended span rule is prepended:

- `'auto'` (default): opposite of the first rule’s effect, or `'active'` when there are no rules.
- `'active' | 'blackout'`: use exactly that baseline where no rule covers.

This applies uniformly to `isActiveAt`, `getSegments`, `classifyRange`, and `getEffectiveBounds`. See details in [Configuration & update()](./configuration.md#baseline-defaulteffect).

## Next steps

- Explore the callable surface in [Core API and Types](./api.md).
- Understand options, versioning, and notices in [Configuration & update()](./configuration.md).
- Convert wall time ↔ epoch in your zone with [Time & timezones](./time.md).
- Produce human‑friendly text with [Rule descriptions](./descriptions.md).
- Use RRStack in React with [React hooks](./react.md).
