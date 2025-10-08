---
title: Core API and Types
---

# Core API and Types

This page enumerates the callable surface (methods, parameters, returns) and the public types you’ll use in day‑to‑day code. For examples and narrative guides, see the rest of the Handbook. For symbol‑level docs, see the hosted [API Reference](https://docs.karmanivero.us/rrstack).

## Package entry points

```ts
// Core
import {
  RRStack,
  describeRule,
  toIsoDuration,
  fromIsoDuration,
  dateOnlyToEpoch,
  epochToWallDate,
  wallTimeToEpoch,
  RRSTACK_CONFIG_SCHEMA,
} from '@karmaniverous/rrstack';

// React adapter
import { useRRStack, useRRStackSelector } from '@karmaniverous/rrstack/react';
```

## Class: RRStack

```ts
new RRStack(opts: RRStackOptions);
```

- Builds a live, timezone‑aware stack; compiles rules immediately.

### Methods

- `toJson(): RRStackOptions`
  - Round‑trippable snapshot with `version` set to the engine’s build version.

- `update(partial?: Partial<RRStackOptions>, policy?: UpdatePolicy): readonly Notice[]`
  - Single entry point for ingesting JSON/config changes.
  - Handles version detection (up/down/invalid) and time‑unit transitions (with clamp conversion for retained rules).
  - Returns notices and also fires `policy.onNotice` for each notice.
  - See [Configuration & update()](./configuration.md#update-and-notices) for details.

- `isActiveAt(t: number): boolean`
  - True when the cascade is active at `t` (half‑open semantics).

- `getSegments(from: number, to: number, opts?: { limit?: number }): Iterable<{ start: number; end: number; status: 'active' | 'blackout' }>`
  - Streams contiguous segments over `[from, to)`. Optional `limit` throws if exceeded.

- `classifyRange(from: number, to: number): 'active' | 'blackout' | 'partial'`
  - Classifies the entire window.

- `getEffectiveBounds(): { start?: number; end?: number; empty: boolean }`
  - Earliest active start and latest active end across the stack.
  - Omits open sides; `empty` indicates “no active coverage.”

- `formatInstant(t: number, opts?: { format?: string; locale?: string }): string`
  - Formats `t` in the stack’s timezone; ISO by default, or a Luxon format string.

- `now(): number`
  - Current time in the configured unit (`'ms'` or `'s'`).

### Static helpers

- `RRStack.isValidTimeZone(tz: string): boolean`
- `RRStack.asTimeZoneId(tz: string): TimeZoneId // throws if invalid`

### Properties

- `timezone: string`
  - Getter/setter. Validated when set; triggers recompile.

- `rules: ReadonlyArray<RuleJson>`
  - Getter/setter. Lightweight validation is applied; triggers recompile.

- `timeUnit: 'ms' | 's'`
  - Getter (immutable). See [Time units](./configuration.md#time-units-and-rounding).

## Helper functions

```ts
// Describe a single rule in plain language (see Descriptions page for options)
describeRule(rule: RuleJson, timezone: TimeZoneId, timeUnit?: UnixTimeUnit, opts?: DescribeOptions): string;

// Duration helpers (UI‑friendly)
toIsoDuration(parts: DurationParts): string;
fromIsoDuration(iso: string): DurationParts;

// Time conversion helpers (wall time ↔ epoch)
dateOnlyToEpoch(date: Date, timezone: TimeZoneId, timeUnit?: UnixTimeUnit): number;
wallTimeToEpoch(date: Date, timezone: TimeZoneId, timeUnit?: UnixTimeUnit): number;
epochToWallDate(epoch: number, timezone: TimeZoneId, timeUnit?: UnixTimeUnit): Date;
```

See details, DST behavior, and mapping tips in [Time & timezones](./time.md).

## Types (selected)

```ts
// Top‑level options
export interface RRStackOptions {
  version?: string; // ignored by constructor; written by toJson()
  timezone: string; // IANA zone id (validated)
  timeUnit?: 'ms' | 's'; // default 'ms'
  defaultEffect?: 'active' | 'blackout' | 'auto'; // default 'auto'
  rules?: RuleJson[]; // default []
}

export interface RRStackOptionsNormalized
  extends Omit<RRStackOptions, 'timeUnit' | 'rules' | 'timezone'> {
  timeUnit: 'ms' | 's';
  rules: readonly RuleJson[];
  timezone: TimeZoneId; // branded, validated
  defaultEffect: 'active' | 'blackout' | 'auto';
}

// Rule JSON and options
export interface RuleJson {
  effect: 'active' | 'blackout';
  duration?: DurationParts; // required for recurring; omit for spans
  options: RuleOptionsJson; // JSON‑friendly subset of rrule Options
  label?: string;
}

export type RuleOptionsJson = Partial<
  Omit<import('rrule').Options, 'dtstart' | 'until' | 'tzid' | 'freq'>
> & {
  freq?:
    | 'yearly'
    | 'monthly'
    | 'weekly'
    | 'daily'
    | 'hourly'
    | 'minutely'
    | 'secondly';
  starts?: number; // clamp in configured unit
  ends?: number; // clamp in configured unit
};

// Durations as structured integers (total > 0)
export interface DurationParts {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

// Outputs and enums
export type InstantStatus = 'active' | 'blackout';
export type RangeStatus = InstantStatus | 'partial';
export type UnixTimeUnit = 'ms' | 's';
export type TimeZoneId = string & { __brand: 'TimeZoneId' };
export type DefaultEffect = InstantStatus | 'auto';
```

## Notices and UpdatePolicy

`update()` returns a `Notice[]` and invokes the optional `policy.onNotice` callback for each notice. Defaults and behavior are summarized below; for examples and edge cases see [Configuration & update()](./configuration.md#update-and-notices).

```ts
export type Notice =
  | {
      kind: 'versionUp';
      level: 'error' | 'warn' | 'info';
      from: string | null;
      to: string;
      action: 'upgrade' | 'rejected' | 'ingestAsCurrent';
      message?: string;
    }
  | {
      kind: 'versionDown';
      level: 'error' | 'warn' | 'info';
      from: string | null;
      to: string;
      action: 'rejected' | 'ingestAsCurrent';
      message?: string;
    }
  | {
      kind: 'versionInvalid';
      level: 'error' | 'warn' | 'info';
      raw: unknown;
      to: string;
      action: 'rejected' | 'ingestAsCurrent';
      message?: string;
    }
  | {
      kind: 'timeUnitChange';
      level: 'error' | 'warn' | 'info';
      from: UnixTimeUnit;
      to: UnixTimeUnit;
      action: 'convertedExisting' | 'acceptedIncomingRules' | 'rejected';
      convertedRuleCount?: number;
      replacedRuleCount?: number;
      message?: string;
    };

export interface UpdatePolicy {
  onVersionUp?: 'error' | 'warn' | 'off'; // default 'off'
  onVersionDown?: 'error' | 'warn' | 'off'; // default 'error'
  onVersionInvalid?: 'error' | 'warn' | 'off'; // default 'error'
  onTimeUnitChange?: 'error' | 'warn' | 'off'; // default 'warn'
  onNotice?: (n: Notice) => void;
}
```

## JSON Schema export

```ts
import type { JSONSchema7 } from 'json-schema';
import { RRSTACK_CONFIG_SCHEMA } from '@karmaniverous/rrstack';
```

- OpenAPI‑safe schema for serialized `RRStackOptions`. See usage and policy in [JSON Schema & validation](./json-schema.md).

## React adapter (subpath `@karmaniverous/rrstack/react`)

- `useRRStack({ json, onChange?, resetKey?, policy?, changeDebounce?, mutateDebounce?, renderDebounce?, logger? })`
  - Returns `{ rrstack, version, flushChanges, flushMutations, cancelMutations, flushRender }`
  - Staged vs compiled behavior; debouncing knobs. See [React hooks](./react.md).

- `useRRStackSelector({ rrstack, selector, isEqual?, renderDebounce?, logger?, resetKey? })`
  - Returns `{ selection, version, flushRender }`
