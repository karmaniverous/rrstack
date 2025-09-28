# RRStack — Requirements

Last updated: 2025-09-28 (UTC)

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
  - version?: string (ignored by constructor; written by toJson)
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

Units and domain (no internal canonicalization)

- All public inputs/outputs (and internal algorithms) operate in the configured unit end-to-end.
- 'ms': millisecond timestamps (Date.now()) + Luxon millisecond methods.
- 's': integer seconds; ends are rounded up to the next integer second to preserve [start, end) with boundary correctness.
- Domain bounds:
  - domainMin() = 0
  - domainMax(unit):
    - 'ms' → 8_640_000_000_000_000 (approx max JS Date)
    - 's' → 8_640_000_000_000

Timezone validation and typing

- Validate timezone strings using Luxon’s IANAZone.isValidZone(tz).
- RRStack.isValidTimeZone(tz: string) → boolean
- RRStack.asTimeZoneId(tz: string) → TimeZoneId (throws if invalid)
- Timezone acceptance depends on host ICU/Intl data (Node build, browser, OS).

Mutability and setters

- options (RRStackOptionsNormalized) is normalized and frozen on the instance.
- Property-style setters:
  - timezone: string getter/setter (validated; recompile on change)
  - rules: readonly RuleJson[] getter; setter validates lite shape and recompiles
  - timeUnit: immutable (changing unit requires a new instance)
- updateOptions({ timezone?, rules? }): batch update with a single recompile.
- Convenience rule mutators (each delegates to rules setter; single recompile):
  - addRule(rule?: RuleJson, index?: number) — when rule omitted, inserts an active open-ended span { effect: 'active', options: {} }
  - removeRule(i), swap(i, j), up(i), down(i), top(i), bottom(i)

Observability (mutation notifications)

- subscribe(listener: (self: RRStack) => void): () => void — notify exactly once post‑mutation (after compile).
- The constructor does not trigger notifications.
- Notifications fire on timezone/rules setters, updateOptions, and convenience mutators.

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
  - OptionsSchema: RRStackOptions parsing
  - RuleLiteSchema: lightweight rule validation at mutation boundaries
- Full rrule options validation occurs during compilation.

Persistence and version handling

- toJson() writes the current package version injected at build time via **RRSTACK_VERSION**.
- The constructor accepts RRStackOptions with optional version and ignores it (future transforms may be added without shape changes).

Packaging and exports

- Rollup builds CJS and ESM outputs; types included.
- Subpath export ./react provides React hooks (see below).
- Runtime dependencies and peerDependencies are marked external; Node built-ins are external.
- Replace plugin injects **RRSTACK_VERSION** at build time for browser-safe versioning.

React adapter (./react)

- Hooks observe a live RRStack instance without re-wrapping its control surface:
  - useRRStack({ json, onChange?, resetKey?, changeDebounce?, mutateDebounce?, renderDebounce?, logger? }) → { rrstack, version, flushChanges, flushMutations, cancelMutations, flushRender }
    - mutateDebounce stages UI edits (rules/timezone) and commits once per window (optional leading).
    - renderDebounce coalesces paints (optional leading; trailing always true).
    - changeDebounce coalesces autosave calls (trailing always true; optional leading).
  - useRRStackSelector({ rrstack, selector, isEqual?, renderDebounce?, logger?, resetKey? }) → { selection, version, flushRender }
- Staged vs compiled behavior
  - Reads of rrstack.rules and rrstack.timezone (and rrstack.toJson()) reflect staged values before commit.
  - Queries (isActiveAt, getSegments, etc.) reflect last committed compiled state until commit.

Generated artifacts policy

- assets/rrstackconfig.schema.json is generated (scripts/gen-schema.ts via zod-to-json-schema and post-processing).
- Do not edit generated artifacts manually; run the generator and commit results.

Release discipline

- Do not bump package version or edit CHANGELOG.md in normal patches.
- Versioning and changelog updates are owned by the release workflow (release-it + auto-changelog).

Documentation

- README and Handbook document:
  - API surface and behavior (including segments limit, bounds semantics).
  - timeUnit semantics and 's' rounding.
  - Timezone/ICU environment notes.
  - React hooks options, staged vs compiled, debounce knobs.
  - Algorithms (deep dive) page detailing the orchestration strategies.

Testing

- Unit tests cover:
  - DST transitions (spring forward/fall back)
  - Daily start-at-midnight patterns
  - Odd-month and every-2-month scenarios with blackout/reactivation cascades
  - Segment sweeps, range classification
  - Effective bounds (open/closed sides, ties, blackout overrides, reverse sweep)
  - React hooks (debounce behaviors, version bump rendering)
- Performance
  - BENCH-gated micro-benchmarks (skipped by default) to characterize hot paths (e.g., getEffectiveBounds, isActiveAt, getSegments) under common workloads.

Non-functional requirements

- Performance: streaming algorithms are memory-bounded; no precomputation of large occurrence sets; finite/local bound search; O(1) open-end detection.
- Determinism: half-open intervals [start, end); 's' mode rounds end upward.
- Immutability: options are frozen; mutators perform immutable updates and a single recompile per call.

API conventions (boolean options)

- Boolean options are named such that their default is false. Undefined (falsy) must have the same meaning as an explicit false; explicit true is opt‑in.
- DescribeOptions defaults:
  - includeTimeZone: false (opt‑in to append “(timezone <tz>)”).
  - includeBounds: false (unchanged).
- Existing code and tests should pass { includeTimeZone: true } when the timezone label is desired.

Out of scope (current)

- Changing timeUnit on an existing instance (construct a new instance instead).
- Full RRULE Options validation via zod (compile remains authoritative).

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

Configuration and injection

- Per-call: describeRule(..., opts?: { translator?: 'strict-en' | DescribeTranslator; translatorOptions?: TranslatorOptions; includeTimeZone?; includeBounds?; formatTimeZone? })
- Instance-level defaults may be added in the future (translator functions are not serialized).

Acceptance criteria (descriptions)

- “Monthly 3rd Tuesday at 05:00” includes “third”, “tuesday”, and “5:00”.
- “Daily at 09:00” includes “every day” and “9:00”.
- COUNT and UNTIL phrasing matches descriptor; local time formatting honors hourCycle/timeFormat options.
