# RRStack

[![npm version](https://img.shields.io/npm/v/@karmaniverous/rrstack.svg)](https://www.npmjs.com/package/@karmaniverous/rrstack) ![Node Current](https://img.shields.io/node/v/@karmaniverous/rrstack) [![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/rrstack) [![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](./CHANGELOG.md) [![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](./LICENSE.md)

Timezone‑aware RRULE stacking engine for Node/TypeScript.

RRStack lets you compose a prioritized stack of time‑based rules (using the battle‑tested rrule library) to compute whether a given instant is active or blackout, enumerate active/blackout segments over a window, classify ranges as active/blackout/partial, and derive effective active bounds. It handles real‑world timezone behavior, including DST transitions, by computing coverage in the rule’s IANA timezone.

- Built on rrule for recurrence logic
- Uses Luxon for timezone/DST‑correct duration arithmetic
- Pure library surface (no I/O side effects)
- JSON persistence and round‑tripping
- Thoroughly tested (DST edge cases, monthly patterns, segment sweeps, notices)

## Installation

```bash
npm install @karmaniverous/rrstack
# or
yarn add @karmaniverous/rrstack
# or
pnpm add @karmaniverous/rrstack
```

- ESM and CJS consumers are supported.
- TypeScript typings are included.
- Node >= 20.

## Quick start

```ts
import { RRStack } from '@karmaniverous/rrstack';

// 1) Define rules (JSON serializable)
const rules = [
  // Daily 05:00–06:00 active
  {
    effect: 'active' as const,
    duration: { hours: 1 },
    options: {
      freq: 'daily',
      byhour: [5],
      byminute: [0],
      bysecond: [0],
    },
    label: 'daily-05',
  },
  // Blackout 05:30–05:45 (overrides active during that slice)
  {
    effect: 'blackout' as const,
    duration: { minutes: 15 },
    options: {
      freq: 'daily',
      byhour: [5],
      byminute: [30],
      bysecond: [0],
    },
    label: 'blk-0530-15m',
  },
];

// 2) Create a stack
const stack = new RRStack({
  timezone: 'America/Chicago',
  rules,
});

// 3) Point query: active?
const t = Date.now();
const isActive = stack.isActiveAt(t); // boolean

// 4) Enumerate segments over a window (half-open [from, to))
const from = Date.UTC(2024, 0, 2, 5, 0, 0);
const to = Date.UTC(2024, 0, 2, 6, 0, 0);
for (const seg of stack.getSegments(from, to)) {
  // { start: number; end: number; status: 'active' | 'blackout' }
}

// 5) Classify a window
const status = stack.classifyRange(from, to); // 'active' | 'blackout' | 'partial'

// 6) Effective bounds (open-sided detection)
const bounds = stack.getEffectiveBounds(); // { start?: number; end?: number; empty: boolean }

// 7) Persist / restore
const json = stack.toJson();
const same = new RRStack(json);
```

## Where to go next (Handbook)

- Getting started, concepts, and examples:
  - See the Handbook entry [Getting started](./handbook/getting-started.md)
  - See [Overview](./handbook/overview.md)
- API, options, types, and outputs (enumerated):
  - See [Core API and Types](./handbook/api.md)
  - See [Configuration & update() policy](./handbook/configuration.md)
- Rule descriptions (plain‑language):
  - See [Rule descriptions](./handbook/descriptions.md)
- React adapter:
  - See [React hooks](./handbook/react.md)
- Timezones and conversion helpers (wall time ↔ epoch):
  - See [Time & timezones](./handbook/time.md)
- JSON Schema & validation:
  - See [JSON Schema & validation](./handbook/json-schema.md)
- Algorithms (deep dive: coverage, segments, bounds):
  - See [Algorithms (deep dive)](./handbook/algorithms.md)
- Performance notes and benches:
  - See [Performance & benchmarking](./handbook/performance.md)

For symbol‑level documentation (methods, parameters, and return types with code signatures), visit the hosted [API Reference](https://docs.karmanivero.us/rrstack).

## Why RRStack?

- Real‑world scheduling usually needs more than one RRULE. You have base activation windows, blackout exceptions, and occasional reactivations. RRStack provides a deterministic cascade: later rules override earlier ones at covered instants.
- Time zones matter. We compute coverage in the rule’s IANA time zone with DST‑aware duration arithmetic (Luxon).
- Half‑open intervals everywhere. All coverage follows [start, end). In seconds mode ('s'), ends are rounded up to the next second to avoid boundary false negatives.
- JSON round‑trip. Store and reload stack configuration (with versioning and notices via `update()`).
- Pure library surface. No I/O side effects; suitable for Node, browsers, and workers.

## License

BSD‑3‑Clause © Jason Williscroft

---

Built for you with ❤️ on Bali! Find more great tools & templates on my GitHub Profile: https://github.com/karmaniverous
