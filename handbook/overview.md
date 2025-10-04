---
title: Overview
---

# RRStack overview

Why this library?

- Real-world scheduling needs more than one RRULE. You have active cadences,
  blackout exceptions, and reactivations that override each other in a
  predictable order.
- Time zones matter. We compute coverage in the rule’s IANA time zone and use
  Luxon for DST-correct duration math (spring forward/fall back).
- Predictable cascade: later rules override earlier ones at covered instants.

Key capabilities

- Point query: isActiveAt(t): boolean
- Stream segments over a window: getSegments(from, to, { limit? })
- Range classification: active | blackout | partial
- Effective bounds (open-sided detection): getEffectiveBounds()
- Human-friendly descriptions (rrule.toText + effect/duration)
- Pluggable descriptions via translators (built-in “strict-en”); boolean options
  default to false — includeTimeZone is opt-in

Quick start

```ts
import { RRStack } from '@karmaniverous/rrstack';

const stack = new RRStack({
  timezone: 'UTC',
  rules: [
    {
      effect: 'active',
      duration: { hours: 1 },
      options: { freq: 'daily', byhour: [5], byminute: [0], bysecond: [0] },
      label: 'daily-05',
    },
    {
      effect: 'blackout',
      duration: { minutes: 15 },
      options: { freq: 'daily', byhour: [5], byminute: [30], bysecond: [0] },
      label: 'blk-0530-15m',
    },
  ],
});

const now = Date.now();
stack.isActiveAt(now); // boolean

// Iterate segments (half‑open [from,to))
const from = Date.UTC(2024, 0, 2, 5, 0, 0);
const to = Date.UTC(2024, 0, 2, 6, 0, 0);
for (const seg of stack.getSegments(from, to)) {
  // { start, end, status: 'active' | 'blackout' }
}

// Persist/restore
const json = stack.toJson();
const same = new RRStack(json);
```

Tips

- In long windows with many overlaps, pass { limit } to getSegments to make the
  enumeration cap explicit (throws if exceeded).
- In 's' timeUnit mode, ends are rounded up to the next second to avoid boundary
  false negatives (still half‑open intervals).
- For UI: prefer chunking long windows (day/week) or a Worker for heavy sweeps.

## Policy & notices (ingestion and commits)

Use UpdatePolicy to control version/unit handling and to surface notices during
ingestion (and during staged commits in the React hook).

Core (programmatic update)

```ts
import type { Notice, UpdatePolicy, RRStackOptions } from '@karmaniverous/rrstack';
import { RRStack } from '@karmaniverous/rrstack';

const stack = new RRStack({ timezone: 'UTC' });
const incoming: Partial<RRStackOptions> = { version: '9.9.9', timeUnit: 's' };

const seen: Notice[] = [];
const policy: UpdatePolicy = {
  onVersionDown: 'warn', // newer incoming than engine → accept with warning
  onTimeUnitChange: 'warn',
  onNotice: (n) => seen.push(n),
};

const notices = stack.update(incoming, policy);
// `notices` and `seen` will include 'versionDown' and 'timeUnitChange'
```

React (ingestion + staged commits)

```tsx
import { useRRStack } from '@karmaniverous/rrstack/react';
import type { Notice, UpdatePolicy, RRStackOptions } from '@karmaniverous/rrstack';

function Editor({ json }: { json: RRStackOptions }) {
  const policy: UpdatePolicy = {
    onVersionDown: 'warn',
    onTimeUnitChange: 'warn',
    onNotice: (n) => console.info('[rrstack.notice]', n.kind, n.action),
  };
  const { rrstack } = useRRStack({ json, policy });
  // policy applies to both json → engine ingestion and staged UI commits
  return <div>Rules: {rrstack.rules.length}</div>;
}
```

## Span rules (continuous coverage)

Not every schedule needs a recurrence. Omit `options.freq` to declare a span
rule with optional open ends. Span rules participate in the cascade exactly like
recurring rules (later rules override earlier ones).

```ts
const rules = [
  {
    effect: 'active' as const,
    // duration omitted
    options: {
      starts: Date.UTC(2024, 0, 10, 5, 0, 0),
      ends: Date.UTC(2024, 0, 10, 7, 0, 0),
    },
  },
];
```

## Baseline (defaultEffect)

RRStack supports a configurable baseline effect for uncovered instants via
`defaultEffect`:

- 'auto' (default): opposite of the first rule’s effect, or 'active' when there
  are no rules.
- 'active' | 'blackout': use exactly that baseline everywhere not covered by
  rules.

Internally, the baseline behaves like a virtual, open‑ended span rule prepended
to the cascade (lowest priority). All query surfaces respect the baseline:
`isActiveAt`, `getSegments`, `classifyRange`, and `getEffectiveBounds` (which
returns open‑sided bounds when the baseline is 'active').

## Bounds & clamps semantics

- Cascade and ties: later rules override earlier rules at covered instants.
  If two rules begin at the same instant, the later rule in the list wins for
  that span (active vs blackout).
- Clamps: `options.starts` → RRULE `dtstart`; `options.ends` → RRULE `until`
  (inclusive of the last start at that instant). Keep this in mind when
  clamping a schedule boundary.
- getEffectiveBounds:
  - `start` is the first active instant (omitted for open‑start coverage that
    is already active at the domain minimum).
  - `end` is the last active instant (omitted for open‑ended coverage).
  - Internally, the latest bound is selected relative to a safe far‑future
    probe; for closed schedules this yields the last finite active end.
- DST and 's' mode: coverage is computed in the rule’s timezone; in `'s'`
  mode, computed ends are rounded to the next integer second to preserve
  half‑open comparisons without boundary regressions.

## Next steps

- React hooks: see “React hooks” page.
- JSON shapes & type helpers: see API pages.

Docs site

- https://docs.karmanivero.us/rrstack

## Timezone conversion helpers

Utilities for converting between wall-clock values in an IANA zone and epoch:

```ts
import { wallTimeToEpoch, dateOnlyToEpoch, epochToWallDate, RRStack } from '@karmaniverous/rrstack';
const tz = RRStack.asTimeZoneId('Europe/Paris');
const wall = new Date(Date.UTC(2025, 6, 20, 9, 0, 0)); // 09:00 (floating)
const t = wallTimeToEpoch(wall, tz, 'ms'); // epoch at 09:00 Paris
const back = epochToWallDate(t, tz, 'ms'); // UTC fields reflect Paris local clock fields
```

See README for UI mapping tips and DST/validation notes.