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

Next steps

- React hooks: see “React hooks” page.
- JSON shapes & type helpers: see API pages.

Docs site

- https://docs.karmanivero.us/rrstack
