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
import { Frequency } from 'rrule';

// 1) Define rules (JSON serializable)
const rules = [
  // Daily 05:00–06:00 active
  {
    effect: 'active' as const,
    duration: 'PT1H',
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
    duration: 'PT15M',
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
  rules,
});

// 3) Point query: active or blackout?
const t = Date.now();
const status = stack.isActiveAt(t); // 'active' | 'blackout'

// 4) Enumerate segments over a window
const from = Date.UTC(2024, 0, 2, 5, 0, 0);
const to = Date.UTC(2024, 0, 2, 6, 0, 0);
for (const seg of stack.getSegments(from, to)) {
  // { start: number; end: number; status: 'active' | 'blackout' }
  // 05:00–05:30 active, 05:30–05:45 blackout, 05:45–06:00 active
}

// 5) Classify a whole range
const range = stack.classifyRange(from, to); // 'active' | 'blackout' | 'partial'

// 6) Persist / restore
const json = stack.toJson(); // RRStackJsonV1
const stack2 = RRStack.fromJson(json);
```

## What problem does RRStack solve?

Many scheduling problems require more than a single RRULE. You might have a base “active” cadence and a set of blackout exceptions that override it in specific conditions, or a few “reactivation” windows that override blackouts. RRStack provides a minimal, deterministic cascade:

- Rules are evaluated in order; the last rule that covers an instant determines that instant’s status.
- Where no rule covers an instant, the baseline is blackout.
- Computation is performed in the rule’s timezone, with correct handling of daylight saving time (using Luxon for duration arithmetic).

## Core Concepts

- RuleJson: a single rule that specifies an effect ('active' or 'blackout'), an ISO 8601 duration, and a subset of rrule Options (plus optional starts/ends to clamp the domain).
- RRStack: an ordered list of RuleJson applied in a cascade; later rules override earlier coverage.
- Query surface:
  - isActiveAt(ms): point query
  - getSegments(from, to): yields contiguous segments of active/blackout status
  - classifyRange(from, to): active | blackout | partial
  - getEffectiveBounds(): first/last active bounds (with open-ended detection)

## API Overview

```ts
import { RRStack } from '@karmaniverous/rrstack';

new RRStack(opts: { timezone: string; rules?: RuleJson[] });

RRStack.fromJson(json: RRStackJsonV1): RRStack
stack.toJson(): RRStackJsonV1

// Rule editing (recompile on change)
stack.addRule(rule: RuleJson, position?: number): void
stack.swapRules(i: number, j: number): void
stack.ruleUp(i: number, steps = 1): void
stack.ruleDown(i: number, steps = 1): void
stack.ruleToTop(i: number): void
stack.ruleToBottom(i: number): void

// Queries
stack.isActiveAt(ms: number): 'active' | 'blackout'
stack.getSegments(
  fromMs?: number,
  toMs?: number,
): Iterable<{ start: number; end: number; status: 'active' | 'blackout' }>

stack.classifyRange(
  fromMs: number,
  toMs: number,
): 'active' | 'blackout' | 'partial'

stack.getEffectiveBounds(): { start?: number; end?: number; empty: boolean }
```

See full API docs: https://karmaniverous.github.io/rrstack

## JSON Shapes and Types

The public types closely mirror rrule’s Options, with a few adjustments to make JSON persistence straightforward.

```ts
import type { Options as RRuleOptions } from 'rrule';

export type instantStatus = 'active' | 'blackout';
export type rangeStatus = instantStatus | 'partial';

export const EPOCH_MIN_MS = 0;
export const EPOCH_MAX_MS = 2_147_483_647_000; // 2038-01-19T03:14:07Z

// Derived from rrule Options, with dtstart/until/tzid removed (set internally),
// plus optional domain clamps: starts/ends (ms).
export type RuleOptionsJson = Partial<
  Omit<RRuleOptions, 'dtstart' | 'until' | 'tzid' | 'freq'>
> &
  Pick<RRuleOptions, 'freq'> & {
    starts?: number; // optional clamp (ms since epoch)
    ends?: number; // optional clamp (ms since epoch)
  };

export interface RuleJson {
  effect: instantStatus; // 'active' | 'blackout'
  duration: string; // ISO 8601 (e.g., 'PT1H', 'P1D')
  options: RuleOptionsJson;
  label?: string;
}

export interface RRStackJsonV1 {
  version: 1;
  timezone: string; // IANA timezone, e.g., 'America/Chicago'
  rules: RuleJson[];
}
```

Notes

- The library compiles JSON into rrule Options with tzid, dtstart, and until set internally. starts/ends are optional domain clamps in epoch milliseconds.
- Durations are ISO 8601 and must be positive. Duration arithmetic uses Luxon in the rule timezone to remain DST-correct.

## Timezones and DST

- All coverage is computed in the rule’s IANA timezone (tzid).
- Occurrence end times are computed by adding the rule’s duration in the rule’s timezone using Luxon. This keeps “spring forward” and “fall back” behavior correct:
  - Example: “2021-03-14 01:30 + 1h” in America/Chicago → 03:30 local (spring forward)
  - Example: “2021-11-07 01:30 + 1h” → 01:30 local (repeated hour on fall back)

## Common Patterns

Third Tuesday monthly at 05:00–06:00

```ts
import { RRule, Frequency } from 'rrule';

const thirdTuesday = {
  effect: 'active' as const,
  duration: 'PT1H',
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
  duration: 'PT1H',
  options: {
    freq: Frequency.DAILY,
    byhour: [9],
    byminute: [0],
    bysecond: [0],
    // Set to midnight on the start date in the target timezone.
    // The first occurrence begins at 09:00 on/after this date.
    // starts: ms('2021-05-01T00:00:00'), // local-to-epoch helper
  },
};
```

Odd months only, with an exception and a reactivation

```ts
const baseOddMonths = {
  effect: 'active' as const,
  duration: 'PT1H',
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
  duration: 'PT1H',
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
  duration: 'PT1H',
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
- starts/ends (ms) are optional domain clamps; open sides are allowed and detected by getEffectiveBounds.

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
