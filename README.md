# RRStack

[![npm version](https://img.shields.io/npm/v/@karmaniverous/rrstack.svg)](https://www.npmjs.com/package/@karmaniverous/rrstack)
![Node Current](https://img.shields.io/node/v/@karmaniverous/rrstack) <!-- TYPEDOC_EXCLUDE -->
[![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/rrstack)
[![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](https://github.com/karmaniverous/rrstack/tree/main/CHANGELOG.md)<!-- /TYPEDOC_EXCLUDE -->
[![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](https://github.com/karmaniverous/rrstack/tree/main/LICENSE.md)

Timezone-aware RRULE stacking engine for Node/TypeScript.

RRStack lets you compose a prioritized stack of time-based rules (using the battle-tested rrule library) to compute whether a given instant is active or blackout, enumerate active/blackout segments over a window, classify ranges as active/blackout/partial, and derive effective active bounds. It handles real-world timezone behavior, including DST transitions, by computing coverage in the rule’s IANA timezone.

- Built on rrule for recurrence logic
- Uses Luxon for timezone/DST-correct duration arithmetic
- Pure library surface (no I/O side effects)
- JSON persistence and round-tripping
- Tested against realistic scenarios (nth-weekday monthly patterns, daylight saving transitions, etc.)

## Continuous (span) rules

Not every schedule needs a recurrence. RRStack supports “span” rules for
continuous coverage bounded by optional clamps:

- Omit `options.freq` to declare a span rule.
- Omit `duration` (required for spans).
- Coverage is continuous across `[starts, ends)`; either side may be open.
- Spans participate in the cascade just like recurring rules; later rules still
  override earlier ones.

Example (active span; Jan 10 05:00–07:00 UTC):

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

UI tip: this maps naturally to a “Does not repeat” option that disables RRULE inputs.

## Installation

```bashnpm install @karmaniverous/rrstack
# or
yarn add @karmaniverous/rrstack
# or
pnpm add @karmaniverous/rrstack
```

- ESM and CJS consumers are supported.
- TypeScript typings are included.

## Quick Start

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
  // Optional: timeUnit: 'ms' | 's' (default 'ms')
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
  // 05:00–05:30 active, 05:30–05:45 blackout, 05:45–06:00 active
}
// 5) Classify a whole range
const range = stack.classifyRange(from, to); // 'active' | 'blackout' | 'partial'

// 6) Persist / restore (roundtrip)
const json = stack.toJson(); // RRStackOptions (includes version)
const stack2 = new RRStack(json);

// 7) Describe a rule (plain-language)
// e.g., "Active for 1 hour: every day at 5:00 (timezone America/Chicago)"
const description = stack.describeRule(0);
```

## What problem does RRStack solve?

Many scheduling problems require more than a single RRULE. You might have a base “active” cadence and a set of blackout exceptions that override it in specific conditions, or a few “reactivation” windows that override blackouts. RRStack provides a minimal, deterministic cascade:

- Rules are evaluated in order; the last rule that covers an instant determines that instant’s status.
- Where no rule covers an instant, the baseline is blackout.
- Computation is performed in the rule’s timezone, with correct handling of daylight saving time (using Luxon for duration arithmetic).

## Core Concepts

- DurationParts: a structured object describing how long each occurrence lasts (non-negative integer fields; at least one > 0).
  - Example: { minutes: 15 }, { hours: 1 }, { days: 1 } (calendar), { hours: 24 } (exact day)
- RuleJson: a single rule that specifies an effect ('active' or 'blackout'), a DurationParts duration, and a subset of rrule Options (plus optional starts/ends to clamp the domain).
- RRStack: an ordered list of RuleJson applied in a cascade; later rules override earlier coverage.
- Query surface:
  - isActiveAt(ms): point query
  - getSegments(from, to): yields contiguous segments of active/blackout status
  - classifyRange(from, to): active | blackout | partial
  - getEffectiveBounds(): first/last active bounds (with open-ended detection)

## API Overview

```ts
import { RRStack, toIsoDuration, fromIsoDuration, describeRule } from '@karmaniverous/rrstack';

new RRStack(opts: { version?: string; timezone: string; timeUnit?: 'ms' | 's'; rules?: RuleJson[] });
stack.toJson(): RRStackOptions // with version
// Options (frozen); property-style setters
stack.timezone: string                  // getter
stack.timezone = 'America/Chicago'      // setter (validates and recompiles)
stack.rules: ReadonlyArray<RuleJson>    // getter
stack.rules = [/* ... */]               // setter (validates and recompiles)
stack.timeUnit: 'ms' | 's'              // getter (immutable)

// Batch update
stack.updateOptions({ timezone?: string, rules?: RuleJson[] }): void

// Rule management (convenience mutators; each performs one recompile)
stack.addRule(rule: RuleJson, index?: number): void
stack.removeRule(index: number): void
stack.swap(i: number, j: number): void
stack.up(i: number): void;
stack.down(i: number): void
stack.top(i: number): void;
stack.bottom(i: number): void

// Helpers
stack.now(): number                     // current time in configured unit
RRStack.isValidTimeZone(tz: string): boolean
RRStack.asTimeZoneId(tz: string): TimeZoneId // throws if invalid

// Queries
stack.isActiveAt(ms: number): boolean               // true when active
stack.getSegments(
  from: number,
  to: number,
  opts?: { limit?: number },
): Iterable<{
  start: number;
  end: number;
  status: 'active' | 'blackout';
}>

stack.classifyRange(
  from: number,
  to: number,
): 'active' | 'blackout' | 'partial'

stack.getEffectiveBounds(): { start?: number; end?: number; empty: boolean }
// Plain-language description
stack.describeRule(index: number, opts?: DescribeOptions): string
```

See full API docs: https://karmaniverous.github.io/rrstack

## JSON Shapes and Types

The public types closely mirror rrule’s Options, with a few adjustments to make JSON persistence straightforward and unit-aware operation explicit.

```ts
import type { Options as RRuleOptions } from 'rrule';

export type instantStatus = 'active' | 'blackout';
export type rangeStatus = instantStatus | 'partial';

export type UnixTimeUnit = 'ms' | 's';

// Branded IANA timezone id after runtime validation.
export type TimeZoneId = string & { __brand: 'TimeZoneId' };

// Structured duration (all fields non-negative integers; at least one > 0).
export interface DurationParts {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/**
 * JSON shape for rule options:
 * - Derived from RRuleOptions with dtstart/until/tzid removed (set internally),
 * - Adds starts/ends (in configured unit) for domain clamping,
 * - freq is optional. When present, it is a lower-case string
 *   ('yearly'|'monthly'|'weekly'|'daily'|'hourly'|'minutely'|'secondly').
 *   When absent, the rule is a continuous span; duration must be omitted.
 */
export type RuleOptionsJson = Partial<
  Omit<RRuleOptions, 'dtstart' | 'until' | 'tzid' | 'freq'>
> & {
  freq?:
    | 'yearly'
    | 'monthly'
    | 'weekly'
    | 'daily'
    | 'hourly'
    | 'minutely'
    | 'secondly';
  starts?: number; // optional clamp (timestamp in configured unit)
  ends?: number; // optional clamp (timestamp in configured unit)
};

export interface RuleJson {
  effect: instantStatus; // 'active' | 'blackout'
  duration?: DurationParts; // recurring only; spans must omit
  options: RuleOptionsJson;
  label?: string;
}
/**
 * Unified, round-trippable options shape.
 * - version is optional on input and ignored by the constructor,
 *   and always written by toJson().
 */
export interface RRStackOptions {
  version?: string;
  timezone: string;
  timeUnit?: 'ms' | 's';
  // Baseline effect for uncovered instants. Defaults to 'auto'.
  defaultEffect?: 'active' | 'blackout' | 'auto';
  rules?: RuleJson[];
```

Notes

- The library compiles DurationParts into a Luxon Duration and computes ends in the rule timezone to remain DST-correct.- Half-open intervals [start, end): in 's' mode, end is rounded up to the next second to avoid boundary false negatives.
- Calendar vs exact:
  - { days: 1 } means “same local time next day” (can be 23 or 25 hours across DST),
  - { hours: 24 } means “exactly 24 hours.”

## JSON Schema

A JSON Schema for the serialized RRStack options (constructor input) is generated from the Zod source of truth and published with the package.

- Browse the schema file in this repo:
  - assets/rrstackconfig.schema.json
- Import it at runtime:
  - export constant: RRSTACK_CONFIG_SCHEMA (from '@karmaniverous/rrstack')

Generation details:

- The schema is produced by scripts/gen-schema.ts using zod-to-json-schema.
- DurationParts positivity is enforced by adding an anyOf that requires at
  least one of the fields (years|months|weeks|days|hours|minutes|seconds) to
  be an integer with minimum 1.

Baseline (defaultEffect)

- RRStack behaves as if a virtual, open-ended span rule is prepended:
  - defaultEffect: 'auto' → opposite of rule 0’s effect, or 'active' if no rules,
  - defaultEffect: 'active' | 'blackout' → use exactly that effect.
- The baseline applies uniformly to isActiveAt, getSegments, classifyRange, and getEffectiveBounds.

Example (programmatic access):

```tsimport { RRSTACK_CONFIG_SCHEMA } from '@karmaniverous/rrstack';

// pass to your JSON Schema validator of choice (e.g., Ajv)
console.log(RRSTACK_CONFIG_SCHEMA.$schema, 'RRStackOptions schema loaded');
```

## React hooks

RRStack ships a tiny React adapter at the subpath `@karmaniverous/rrstack/react`. The
hooks observe a live RRStack instance without re‑wrapping its control surface:

- `useRRStack(json, onChange?, { resetKey?, debounce?, logger? })` →
  `{ rrstack, version, flush, apply, flushApply, flushRender }`
- `useRRStackSelector(rrstack, selector, isEqual?)` → derived value; re‑renders
  only when the selection changes.

Debounce knobs

- `debounce`: coalesce autosave (`onChange`) calls.
- `applyDebounce`: coalesce frequent UI → `rrstack.updateOptions` calls (e.g., typing).
- `renderDebounce`: coalesce version bumps from rrstack notifications to reduce repaint churn.

Helpers

- `apply(p)`: apply `{ timezone?, rules? }` to rrstack using `applyDebounce`.
- `flushApply()`, `flushRender()`, `flush()` to force pending operations immediately.

Example

```tsx
import { useRRStack } from '@karmaniverous/rrstack/react';
import type { RRStackOptions } from '@karmaniverous/rrstack';

function Editor({ json }: { json: RRStackOptions }) {
  const { rrstack, version, flush } = useRRStack(
    json,
    (s) => {
      // autosave (debounced by the hook if configured)
      void saveToServer(s.toJson());
    },
    {
      debounce: 500, // autosave
      applyDebounce: 150, // UI → rrstack
      renderDebounce: { delay: 50, leading: true }, // rrstack → UI
    },
  );

  // Use `version` to memoize heavy derived values (e.g. segments)

  return (
    <button
      onClick={() => {
        /* ... */ flush();
      }}
    >
      Save now
    </button>
  );
}
```

See “Handbook → React” on the docs site for full details:
https://docs.karmanivero.us/rrstack

## Rule description helpers

Build a human-readable string describing a rule’s cadence using rrule’s toText(), augmented with effect and duration.

- Instance method (describe compiled rule by index):

```ts
const text = stack.describeRule(0); // "Active for 1 hour: every day at 5:00 (timezone America/Chicago)"
const textWithBounds = stack.describeRule(0, {
  includeTimeZone: true, // default true
  includeBounds: false, // default false; when true, appends [from ...; until ...] if present
});
```

- Helper function (compile on the fly from JSON):

```ts
import { describeRule, RRStack } from '@karmaniverous/rrstack';

const rule = {
  effect: 'active' as const,
  duration: { hours: 1 },
  options: {
    freq: 'daily' as const,
    byhour: [9],
    byminute: [0],
    bysecond: [0],
  },
};

const text = describeRule(rule, RRStack.asTimeZoneId('UTC'), 'ms');
// => "Active for 1 hour: every day at 9:00 (timezone UTC)"
```

## Duration helpers

These utilities can be handy for interop (config files, CLI, or user input).

```ts
import { toIsoDuration, fromIsoDuration } from '@karmaniverous/rrstack';

// Build an ISO string from structured parts
toIsoDuration({ hours: 1, minutes: 30 }); // 'PT1H30M'
toIsoDuration({ days: 1 }); // 'P1D'  (calendar day)
toIsoDuration({ hours: 24 }); // 'PT24H' (exact day)
toIsoDuration({ weeks: 2 }); // 'P2W'
toIsoDuration({ weeks: 1, days: 2 }); // 'P9D'  (weeks normalized to days)

// Parse an ISO string to structured parts (integers only)
fromIsoDuration('PT1H30M'); // { hours: 1, minutes: 30 }
fromIsoDuration('P1D'); // { days: 1 }
fromIsoDuration('PT24H'); // { hours: 24 }
fromIsoDuration('P2W'); // { weeks: 2 }

// Invalid inputs (throw):
// - fractional values like 'PT1.5H'
// - mixed weeks with other fields like 'P1W2D'
```

## Segment enumeration limit

- getSegments accepts an optional per-call limit to bound enumeration explicitly:
  - [...stack.getSegments(from, to, { limit: 1000 })] throws once the limit would be exceeded (no silent truncation).

Performance note

- The iterator is streaming and memory-bounded, but the number of segments can
  grow large when many rules overlap across long windows. For very large windows
  or real-time UI, prefer chunking by day/week and use the limit option to
  guard enumeration.

## Open-ended bounds example

```ts
// Daily 05:00–06:00 starting on 2024-01-10, with no end clamp (open end)
const stack = new RRStack({
  timezone: 'UTC',
  rules: [
    {
      effect: 'active',
      duration: { hours: 1 },
      options: {
        freq: 'daily',
        byhour: [5],
        byminute: [0],
        bysecond: [0],
        starts: Date.UTC(2024, 0, 10, 0, 0, 0),
      },
    },
  ],
});
const b = stack.getEffectiveBounds(); // { start: 2024-01-10T05:00Z, end: undefined, empty: false }
```

## Timezones and DST

- All coverage is computed in the rule’s IANA timezone (tzid).
- Occurrence end times are computed by adding the rule’s duration in the rule’s timezone using Luxon. This keeps “spring forward” and “fall back” behavior correct:
  - Example: “2021-03-14 01:30 + 1h” in America/Chicago → 03:30 local (spring forward)
  - Example: “2021-11-07 01:30 + 1h” → 01:30 local (repeated hour on fall back)

### Selecting and enumerating time zones

- RRStackOptions.timezone expects an IANA time zone identifier (e.g., 'America/Chicago', 'Europe/London', 'UTC').
- Validation is performed at runtime (Luxon’s IANAZone.isValidZone). Acceptance depends on the host’s ICU/Intl data (Node build, browser, OS). Always validate user input:
  - RRStack.isValidTimeZone('America/Chicago') => boolean
  - RRStack.asTimeZoneId('America/Chicago') => branded type or throws
- Enumerate supported zones in the current environment (when available):

  ```ts
  import { RRStack } from '@karmaniverous/rrstack';

  // List zones supported by this runtime (modern Node/browsers)
  const zones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [];

  // Optional: filter/validate with RRStack to be safe
  const validZones = zones.filter(RRStack.isValidTimeZone);
  ```

- Cross-environment pickers: ship a curated list (still validate at runtime)
  - Lightweight: @vvo/tzdb (JSON of IANA zones + metadata)
  - Heavier: moment-timezone (moment.tz.names())
- References
  - IANA TZDB: https://www.iana.org/time-zones
  - Wikipedia list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

## Bounds and clamp semantics

- Cascade and ties
  - Later rules override earlier rules at covered instants. If a blackout and
    an active rule both start at the same instant, the later rule in the list
    wins for that instant (and its duration).

- Domain clamps (starts/ends)
  - RRStack maps `options.starts` to RRULE `dtstart` and `options.ends` to
    RRULE `until`. RRULE’s `until` is inclusive of the last start; i.e., a
    start that is exactly equal to `until` may still occur. Plan clamps with
    this inclusive behavior in mind.
  - Intervals produced by RRStack are evaluated as half‑open `[start, end)`.
    In `'s'` timeUnit mode, RRStack rounds computed ends up to the next integer
    second to avoid boundary false negatives.

- getEffectiveBounds
  - `start` is the first instant the cascade is active (omitted when the
    cascade is open‑start and already active from the domain minimum).
  - `end` is the last instant after which the cascade is not active anymore.
    For open‑ended coverage, `end` is omitted (`undefined`).
  - Internally, the latest bound is determined relative to a far‑future probe:
    for closed schedules, this yields the last finite active end; for truly
    open‑ended actives, `end` remains `undefined`.

- Time zones and DST
  - All coverage (including end arithmetic) is computed in the rule’s IANA time
    zone. In `'s'` mode, duration spans remain exact integer seconds across DST
    transitions (e.g., 3600 seconds for a 1‑hour rule).

## Version handling

- toJson writes the current package version via a build-time injected constant (`__RRSTACK_VERSION__`) so no package.json import is needed at runtime.- The constructor accepts RRStackOptions with an optional version key and ignores it. Version-based transforms may be added in the future without changing the public shape.

## Common Patterns

Third Tuesday monthly at 05:00–06:00

```ts
import { RRule } from 'rrule';

const thirdTuesday = {
  effect: 'active' as const,
  duration: { hours: 1 },
  options: {
    freq: 'monthly',
    bysetpos: 3,
    byweekday: [RRule.TU.nth(3)],
    byhour: [5],
    byminute: [0],
    bysecond: [0],
    // Optional: anchor the cadence with starts to define the interval phase.
    // starts: Date.UTC(2024, 0, 16, 5, 0, 0),
  },
  label: '3rd-tue-05',
};
```

Daily at 09:00 starting on a date boundary

```ts
// starts at midnight local; BYHOUR/BYMINUTE produce the 09:00 occurrence
const daily9 = {
  effect: 'active' as const,
  duration: { hours: 1 },
  options: {
    freq: 'daily',
    byhour: [9],
    byminute: [0],
    bysecond: [0],
    // Set to midnight on the start date in the target timezone.
    // The first occurrence begins at 09:00 on/after this date.
    // starts: ms('2021-05-01T00:00:00'),
  },
};
```

Odd months only, with an exception and a reactivation

```ts
import { RRule } from 'rrule';

const baseOddMonths = {
  effect: 'active' as const,
  duration: { hours: 1 },
  options: {
    freq: 'monthly',
    bymonth: [1, 3, 5, 7, 9, 11],
    byweekday: [RRule.TU.nth(3)],
    byhour: [5],
    byminute: [0],
    bysecond: [0],
    // Anchor to a known occurrence to define stepping
    // starts: ms('2021-01-19T05:00:00'),
  },
};

const julyBlackout = {
  effect: 'blackout' as const,
  duration: { hours: 1 },
  options: {
    freq: 'yearly',
    bymonth: [7],
    byweekday: [RRule.TU.nth(3)],
    byhour: [5],
    byminute: [0],
    bysecond: [0],
  },
};

const july20Reactivate = {
  effect: 'active' as const,
  duration: { hours: 1 },
  options: {
    freq: 'yearly',
    bymonth: [7],
    bymonthday: [20],
    byhour: [5],
    byminute: [0],
    bysecond: [0],
  },
};
```

## Tips

- Later rules override earlier ones at covered instants; order matters.
- When using interval-based monthly rules, anchoring starts to the first real occurrence can be helpful to define cadence.
- starts/ends (timestamps in the configured unit) are optional domain clamps; open sides are allowed and detected by getEffectiveBounds.

## Validation and Testing

- The library ships with unit tests (Vitest) covering:
  - DST transitions (spring forward/fall back)
  - Daily start-at-midnight patterns
  - Monthly odd-month and every-2-month scenarios with blackout/reactivation cascades
  - Segment sweeps and range classification

Run locally:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## License

BSD-3-Clause © Jason Williscroft

Built for you with ❤️ on Bali! Find more great tools & templates on my GitHub Profile: https://github.com/karmaniverous
