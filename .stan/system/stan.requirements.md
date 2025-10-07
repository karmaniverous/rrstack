# RRStack — Requirements

Last updated: 2025-10-06 (UTC)

Purpose

- Define durable, repository-specific requirements for RRStack (timezone‑aware RRULE stacking engine for Node/TypeScript).
- This document captures functional and non‑functional requirements, API surface, algorithms, packaging, and documentation/testing policies.
- Project-specific assistant instructions live in stan.project.md. The system prompt (stan.system.md) remains repo-agnostic.

Targets and runtime

- Library runs in both Node and browsers.
- Pure library surface (no I/O side effects); suitable for UI, workers, and server.
- ESM and CJS bundles provided via Rollup; TypeScript typings are included.
- Node engine: >= 20 (per package.json).

Functional scope

- Compose a prioritized stack of time-based rules (rrule + continuous spans) to:
  - Answer point queries: isActiveAt(ms|s) → boolean.
  - Stream contiguous segments of active/blackout status over a window.
  - Classify a whole range as 'active' | 'blackout' | 'partial'.
  - Compute effective active bounds across all rules, including open-sided detection.
- Timezone/DST correctness: all coverage is computed in the rule’s IANA timezone with Luxon for duration arithmetic.
- JSON persistence with round-tripping (toJson()/constructor).
- Minimal React adapter shipped at subpath export ./react.

Public API (core types and shapes)

- RRStackOptions (constructor input/serialized output)
  - version?: string (ignored by constructor for behavior; used by the version pipeline in update(); written by toJson)
  - timezone: string (validated at runtime; narrowed internally)
  - timeUnit?: 'ms' | 's' (default 'ms')
  - defaultEffect?: 'active' | 'blackout' | 'auto' (default 'auto')
  - rules?: RuleJson[] (default [])
- RRStackOptionsNormalized (stored on the instance; frozen)
  - timeUnit: 'ms' | 's'
  - rules: readonly RuleJson[]
  - timezone: TimeZoneId (branded, validated string)
  - defaultEffect: 'active' | 'blackout' | 'auto'
- RuleJson
  - effect: 'active' | 'blackout'
  - duration?: DurationParts (required for recurring rules; must be omitted for spans)
  - options: RuleOptionsJson (JSON-friendly subset of rrule Options)
  - label?: string
- RuleOptionsJson
  - freq?: 'yearly' | 'monthly' | 'weekly' | 'daily' | 'hourly' | 'minutely' | 'secondly'
  - starts?: number (timestamp in configured unit)
  - ends?: number (timestamp in configured unit)
- DurationParts (integers; total > 0): years, months, weeks, days, hours, minutes, seconds
- UnixTimeUnit: 'ms' | 's'
- TimeZoneId: branded string (validated IANA zone)

Continuous (span) rules

- Omit options.freq to declare a span rule; duration must be omitted for spans.
- Coverage is continuous across [starts, ends); either side may be open.
- Spans participate in the cascade identically to recurring rules; later rules override earlier coverage at covered instants.

Baseline (defaultEffect)

- RRStack behaves as if a virtual, open-ended span rule is prepended (lowest priority):
  - defaultEffect: 'auto' → opposite of the first rule’s effect, or 'active' when no rules.
  - defaultEffect: 'active' | 'blackout' → exactly that baseline where no rule covers.
- The baseline applies uniformly to isActiveAt, getSegments, classifyRange, and getEffectiveBounds.
- getEffectiveBounds returns open-sided bounds when the baseline is 'active' and no finite active contributors exist.

Units and domain

- All public inputs/outputs (and internal algorithms) operate in the configured unit end-to-end.
- 'ms': millisecond timestamps (Date.now()) + Luxon millisecond methods.
- 's': integer seconds; ends are rounded up to the next integer second to preserve [start, end) with boundary correctness.
- Domain bounds:
  - domainMin() = 0
  - domainMax(unit):
    - 'ms' → 8_640_000_000_000_000 (approx max JS Date)
    - 's' → 8_640_000_000_000
- timeUnit is MUTABLE via RRStack.update(...). When timeUnit changes, the engine converts retained rules’ clamp timestamps (starts/ends) between units before compile; incoming rules provided in the same update are accepted as already expressed in the new unit (no conversion applied to those).

Version handling (ingestion pipeline)

- Effective (engine) version
  - The “current RRStack version” is the engine’s build-time version (**RRSTACK_VERSION**). toJson() always writes that value.
- Version detector and upgrader (front of update pipeline)
  - On every update(), detect the incoming JSON version string (may be missing or invalid).
  - Invoke internal upgradeConfig(from: string | null, to: string, json: RRStackOptions): RRStackOptions.
    - Today: no-op (returns json unchanged).
    - Purpose: future-proofing for data model changes. It runs on every accepted version mismatch per policy.
- UpdatePolicy (defaults and behavior)
  - onVersionUp: incoming version older than engine version.
    - 'error' | 'warn' | 'off' (default 'off'). Applying is allowed by default; upgrader runs (no-op today).
  - onVersionDown: incoming version newer than engine version.
    - 'error' | 'warn' | 'off' (default 'error'). Default is to reject; if 'warn' or 'off', ingest “as if current version” (treat incoming version as engine version for this update; upgrader is still invoked with (engine→engine)).
  - onVersionInvalid: incoming version not valid semver.
    - 'error' | 'warn' | 'off' (default 'error'). Default reject; if 'warn' or 'off', ingest “as if current version” (invoke upgrader with engine→engine).
  - onTimeUnitChange:
    - 'error' | 'warn' | 'off' (default 'warn'). If 'warn' or 'off', convert retained clamp timestamps prior to applying other replacements (see Unit conversion below).
  - onNotice?: (n: Notice) => void
    - Optional callback invoked for each notice the update() produces.

Update API (single entry point)

- Signature
  - update(partial?: Partial<RRStackOptions>, policy?: UpdatePolicy): readonly Notice[]
- Behavior
  - Applies timezone, defaultEffect, rules, and timeUnit in one pass.
  - Version pipeline executes first; policies can reject or accept with warnings/informational notices.
  - Rules semantics: if rules is provided, it replaces the entire list (no per-rule merge).
  - Recompile exactly once at the end of a successful apply.
  - Returns a readonly array of Notice values; also invokes onNotice (if provided) for each notice in order.
- Removal of updateOptions
  - updateOptions is removed. Call update() for all JSON ingestion and partial merges.

Unit conversion (when timeUnit changes)

- If partial.rules is provided alongside a timeUnit change:
  - Replace rules with the provided array; treat those timestamps as already in the new unit; do not convert those incoming rules.
- If partial.rules is not provided:
  - Convert all retained rules’ options.starts/options.ends from oldUnit → newUnit:
    - ms → s: Math.trunc(ms / 1000)
    - s → ms: s \* 1000
  - DurationParts are unitless; no conversion.
- Recompile in the new unit. Query semantics remain the same (computeOccurrenceEnd still rounds ends up in 's' mode to preserve [start, end)).

Notices (return type and callback payloads)

- Notice is a discriminated union with stable kinds and levels so hosts can branch or log consistently:

  ```ts
  export type Notice =
    | {
        kind: 'versionUp';
        level: 'error' | 'warn' | 'info';
        from: string | null; // null when missing/invalid
        to: string; // engine version
        action: 'upgrade' | 'rejected' | 'ingestAsCurrent';
        message?: string;
      }
    | {
        kind: 'versionDown';
        level: 'error' | 'warn' | 'info';
        from: string | null;
        to: string; // engine version
        action: 'rejected' | 'ingestAsCurrent';
        message?: string;
      }
    | {
        kind: 'versionInvalid';
        level: 'error' | 'warn' | 'info';
        raw: unknown; // original incoming value
        to: string; // engine version
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
  ```

Update policy type

- The policy object accepted by update():

  ```ts
  export interface UpdatePolicy {
    onVersionUp?: 'error' | 'warn' | 'off'; // default 'off'
    onVersionDown?: 'error' | 'warn' | 'off'; // default 'error'
    onVersionInvalid?: 'error' | 'warn' | 'off'; // default 'error'
    onTimeUnitChange?: 'error' | 'warn' | 'off'; // default 'warn'
    onNotice?: (n: Notice) => void;
  }
  ```

Persistence and version

- toJson() remains the single source of serialized truth:
  - Writes the build-time version (**RRSTACK_VERSION**).
  - Unbrands timezone to a plain string.
  - Clones arrays.
  - In the React façade, overlays staged values so autosave receives exactly what the user sees.

JSON Schema

- The schema is produced by scripts/gen-schema.ts using Zod's native JSON Schema conversion.
- OpenAPI-safe policy:
  - The published JSON Schema intentionally omits advanced conditional/positivity constraints (e.g., “duration required when freq is present”, “at least one positive duration part”).
  - These constraints are enforced at runtime by Zod (ruleLiteSchema/superRefine and compilation checks).
  - Rationale: improve compatibility with OpenAPI tooling such as serverless-openapi-documenter, which may misinterpret anyOf/required combinations.

Algorithms (unit/timezone-aware; streaming where applicable)

Point query

- isActiveAt(t): boolean
  - Span: s <= t < e (open sides use domainMin/domainMax)
  - Recurrence: robust coverage via day-window enumeration + structural matches + bounded backward enumeration using rrule and computeOccurrenceEnd in rule tz.

Streaming segments

- getSegments(from, to, { limit? }): Iterable<{ start, end, status }>
  - Streaming, memory-bounded k-way merge over per-rule boundary streams (starts/ends).
  - Ends processed before starts at the same timestamp to preserve last‑wins semantics.
  - Optional limit caps emissions and throws if exceeded (no silent truncation).

Range classification

- classifyRange(from, to): 'active' | 'blackout' | 'partial'
  - Derived via scanning segments; early-exits on mixed coverage.

Effective bounds

- getEffectiveBounds(): { start?: number; end?: number; empty: boolean }
  - Earliest-bound: candidate-filtered small forward sweep; detects open-start when coverage is active at domainMin due to open-start active sources.
  - Open-end detection: O(1) stack inspection — cascade is open-ended iff the last open-ended candidate is an active source (active open span, infinite active recurrence with any start, or active baseline).
  - Latest-bound: finite/local — compute a finite probe (max end across finite contributors) and run a bounded reverse sweep to find the latest active→blackout transition; short‑circuit when applicable. Never scan far-future.

Coverage helpers and horizons

- Compute occurrence ends in the rule timezone (Luxon), rounding up in 's' mode.
- enumerationHorizon(rule): duration/frequency-aware window (ms|s).
- epochToWallDate / floatingDateToZonedEpoch: convert between epoch (unit) and rrule floating Date with proper timezone.

Validation policy (zod)

- Minimal runtime checks:
  - ruleOptionsSchema: RRStackOptions parsing
  - ruleLiteSchema: lightweight rule validation at mutation boundaries
- Full rrule options validation occurs during compilation.

Packaging and exports

- Rollup builds CJS and ESM outputs; types included.
- Subpath export ./react provides React hooks (see below).
- Runtime dependencies and peerDependencies are marked external; Node built-ins are external.
- Replace plugin injects **RRSTACK_VERSION** at build time for browser-safe versioning.

React adapter (./react)

- Hooks observe a live RRStack instance without re-wrapping its control surface:
  - useRRStack({ json, onChange?, resetKey?, policy?, changeDebounce?, mutateDebounce?, renderDebounce?, logger? }) → { rrstack, version, flushChanges, flushMutations, cancelMutations, flushRender }
    - mutateDebounce stages UI edits (rules/timezone) and commits once per window.
    - renderDebounce coalesces paints (optional leading; trailing always true).
    - changeDebounce coalesces autosave calls (trailing always true; optional leading).
  - useRRStackSelector({ rrstack, selector, isEqual?, renderDebounce?, logger?, resetKey? }) → { selection, version, flushRender }
- Ingestion loop (form → engine)
  - The hook watches the json prop (by comparator ignoring version); when it changes, it invokes rrstack.update(json, policy) via the mutate manager (debounced if configured), then commits once per window.
  - The optional `policy` prop is applied to both ingestion and staged commits; use `onNotice` to surface notices centrally.
  - On commit, rrstack notifies and the hook calls onChange once (debounced if configured). onChange handlers typically persist rrstack.toJson().
  - Using toJson() in onChange and the comparator guard avoids ping‑pong loops.
- Staged vs compiled behavior
  - Reads of rrstack.rules and rrstack.timezone (and rrstack.toJson()) reflect staged values before commit.
  - Queries (isActiveAt, getSegments, etc.) reflect last committed compiled state until commit.

Release discipline

- Do not bump package version or edit CHANGELOG.md in normal patches.
- Versioning and changelog updates are owned by the release workflow (release-it + auto-changelog).

Documentation

- README and Handbook document:
  - API surface and behavior (including segments limit, bounds semantics).
  - timeUnit semantics, unit-change conversion details, and 's' rounding.
  - Timezone/ICU environment notes.
  - React hooks options, staged vs compiled, debounce knobs, and the form→engine ingestion flow via update().
  - Algorithms (deep dive) page detailing the orchestration strategies.

Testing

- Unit tests cover:
  - DST transitions (spring forward/fall back)
  - Daily start-at-midnight patterns
  - Odd-month and every-2-month scenarios with blackout/reactivation cascades
  - Segment sweeps, range classification
  - Effective bounds (open/closed sides, ties, blackout overrides, reverse sweep)
  - update(): version policies (up/down/invalid), timeUnit change (retained vs incoming rules), notices and callback invocation
  - React hooks (debounce behaviors, version bump rendering, ingestion via update)
- Performance
  - BENCH-gated micro-benchmarks (skipped by default) to characterize hot paths (e.g., getEffectiveBounds, isActiveAt, getSegments) under common workloads.

API conventions (boolean options)

- Boolean options are named such that their default is false. Undefined (falsy) must have the same meaning as an explicit false; explicit true is opt‑in.
- DescribeOptions defaults (unchanged):
  - includeTimeZone: false (opt‑in to append “(timezone <tz>)”).
  - includeBounds: false (unchanged).

Rule descriptions — pluggable translator and frequency lexicon

Descriptor (AST)

- Build a normalized descriptor from CompiledRule; no rrule objects leak through.
- Base: { kind: 'span' | 'recur', effect, tz, unit, clamps?: { starts?, ends? } }
- Recur: { freq: FrequencyStr, interval: number, duration: DurationParts, by: { months?, monthDays?, yearDays?, weekNos?, weekdays?: Array<{ weekday: 1..7; nth?: ±1..±5 }>, hours?, minutes?, seconds?, setpos?, wkst? }, count?, until? }
- clamps timestamps are in the configured unit; until semantics reflect rrule’s inclusive start.

Translators (pluggable)

- type DescribeTranslator = (desc: RuleDescriptor, opts?: TranslatorOptions) => string
- TranslatorOptions:
  - frequency?: Partial<FrequencyLexicon>
  - timeFormat?: 'hm' | 'hms' | 'auto'
  - hourCycle?: 'h23' | 'h12'
  - ordinals?: 'long' | 'short'
  - locale?: string (Luxon setLocale)
  - lowercase?: boolean
- Built-in strict-en:
  - Literal phrasing with complete constraints.
  - Interval phrasing:
    - interval === 1 → noun form (“every year/month/week/day/hour/minute/second”)
    - interval > 1 → “every N {plural(noun)}”
  - Nth weekday: “on the third tuesday”; last via -1.
  - Time of day via formatLocalTime in rule tz.
  - COUNT/UNTIL appended (“for N occurrences”, “until YYYY‑MM‑DD”).

Frequency lexicon

- Types:
  - FrequencyAdjectiveLabels, FrequencyNounLabels, FrequencyLexicon
- Constants:
  - FREQUENCY_ADJECTIVE_EN, FREQUENCY_NOUN_EN, FREQUENCY_LEXICON_EN
- UI helper:
  - toFrequencyOptions(labels?: FrequencyAdjectiveLabels) → Array<{ value: FrequencyStr; label: string }>, ordered.

Acceptance criteria (descriptions)

- “Monthly 3rd Tuesday at 05:00” includes “third”, “tuesday”, and “5:00”.
- “Daily at 09:00” includes “every day” and “9:00”.
- COUNT and UNTIL phrasing matches descriptor; local time formatting honors hourCycle/timeFormat options.
