<!-- TYPEDOC_EXCLUDE -->

> [API Documentation](https://karmaniverous.github.io/rrstack) • [CHANGELOG](https://github.com/karmaniverous/rrstack/tree/main/CHANGELOG.md)

<!-- /TYPEDOC_EXCLUDE -->

# RRStack

Timezone-aware RRULE stacking engine for Node/TypeScript.

RRStack lets you compose a prioritized stack of time-based rules (using the battle-tested rrule library) to compute whether a given instant is active or blackout, enumerate active/blackout segments over a window, classify ranges as active/blackout/partial, and derive effective active bounds. It handles real-world timezone behavior, including DST transitions, by computing coverage in the rule’s IANA timezone.

- Built on rrule for recurrence logic
- Uses Luxon for timezone/DST-correct duration arithmetic
- Pure library surface (no I/O side effects)
- JSON persistence and round-tripping
- Tested against realistic scenarios (nth-weekday monthly patterns, daylight saving transitions, etc.)

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

## Quick Start

```ts
import { RRStack } from '@karmaniverous/rrstack';
import { Frequency, RRule } from 'rrule';

// 1) Define rules (JSON serializable)
const rules = [
  // Daily 05:00–06:00 active
  {
    effect: 'active' as const,
    duration: { hours: 1 },
    options: {
      freq: Frequency.DAILY,
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
      freq: Frequency.DAILY,
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

// 3) Point query: active or blackout?
const t = Date.now();
const status = stack.isActiveAt(t); // 'active' | 'blackout'

// 4) Enumerate segments over a window (half-open [from, to))
const from = Date.UTC(2024, 0, 2, 5, 0, 0);
const to = Date.UTC(2024, 0, 2, 6, 0, 0);
for (const seg of stack.getSegments(from, to)) {
  // { start: number; end: number; status: 'active' | 'blackout' }
  // 05:00–05:30 active, 05:30–05:45 blackout, 05:45–06:00 active
}

// 5) Classify a whole range
const range = stack.classifyRange(from, to); // 'active' | 'blackout' | 'partial'

// 6) Persist / restore
const json = stack.toJson(); // RRStackJson
const stack2 = RRStack.fromJson(json);
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
import { RRStack, toIsoDuration, fromIsoDuration } from '@karmaniverous/rrstack';

new RRStack(opts: { timezone: string; timeUnit?: 'ms' | 's'; rules?: RuleJson[] });

RRStack.fromJson(json: RRStackJson): RRStack
stack.toJson(): RRStackJson

// Options (frozen); property-style setters
stack.timezone: string                  // getter
stack.timezone = 'America/Chicago'      // setter (validates and recompiles)
stack.rules: ReadonlyArray<RuleJson>    // getter
stack.rules = [/* ... */]               // setter (validates and recompiles)
stack.timeUnit: 'ms' | 's'              // getter (immutable)

// Batch update
stack.updateOptions({ timezone?: string, rules?: RuleJson[] }): void

// Helpers
stack.now(): number                     // current time in configured unit
RRStack.isValidTimeZone(tz: string): boolean
RRStack.asTimeZoneId(tz: string): TimeZoneId // throws if invalid

// Queries
stack.isActiveAt(ms: number): 'active' | 'blackout'
stack.getSegments(
  from: number,
  to: number,
): Iterable<{ start: number; end: number; status: 'active' | 'blackout' }>

stack.classifyRange(
  from: number,
  to: number,
): 'active' | 'blackout' | 'partial'

stack.getEffectiveBounds(): { start?: number; end?: number; empty: boolean }
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
 * - Adds starts/ends (in configured unit) for domain clamping.
 */
export type RuleOptionsJson = Partial<
  Omit<RRuleOptions, 'dtstart' | 'until' | 'tzid' | 'freq'>
> &
  Pick<RRuleOptions, 'freq'> & {
    starts?: number; // optional clamp (timestamp in configured unit)
    ends?: number; // optional clamp (timestamp in configured unit)
  };

export interface RuleJson {
  effect: instantStatus; // 'active' | 'blackout'
  duration: DurationParts; // structured, positive total
  options: RuleOptionsJson;
  label?: string;
}

export interface RRStackJson {
  version: string;
  timezone: TimeZoneId;
  timeUnit: 'ms' | 's';
  rules: RuleJson[];
}
```

Notes

- The library compiles DurationParts into a Luxon Duration and computes ends in the rule timezone to remain DST-correct.
- Half-open intervals [start, end): in 's' mode, end is rounded up to the next second to avoid boundary false negatives.
- Calendar vs exact:
  - { days: 1 } means “same local time next day” (can be 23 or 25 hours across DST),
  - { hours: 24 } means “exactly 24 hours.”

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

## Timezones and DST

- All coverage is computed in the rule’s IANA timezone (tzid).
- Occurrence end times are computed by adding the rule’s duration in the rule’s timezone using Luxon. This keeps “spring forward” and “fall back” behavior correct:
  - Example: “2021-03-14 01:30 + 1h” in America/Chicago → 03:30 local (spring forward)
  - Example: “2021-11-07 01:30 + 1h” → 01:30 local (repeated hour on fall back)

## Version handling

- toJson writes the current package version via a build-time injected constant (**RRSTACK_VERSION**) so no package.json import is needed at runtime.
- fromJson accepts a versioned shape (RRStackJson). Version-based transforms may be added in the future without changing the public shape.

## Common Patterns

Third Tuesday monthly at 05:00–06:00

```ts
import { RRule, Frequency } from 'rrule';

const thirdTuesday = {
  effect: 'active' as const,
  duration: { hours: 1 },
  options: {
    freq: Frequency.MONTHLY,
    byweekday: [RRule.TU.nth(3)],
    byhour: [5],
    byminute: [0],
    bysecond: [0],
    // Optional: anchor the cadence with starts to define the interval phase.
    // starts: Date.UTC(2021, 0, 19, 5, 0, 0),
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
    freq: Frequency.DAILY,
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
const baseOddMonths = {
  effect: 'active' as const,
  duration: { hours: 1 },
  options: {
    freq: Frequency.MONTHLY,
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
    freq: Frequency.YEARLY,
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
    freq: Frequency.YEARLY,
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
