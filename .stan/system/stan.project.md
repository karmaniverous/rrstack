# RRStack — Project Requirements (repo-specific)

Last updated: 2025-08-24 (UTC)

Purpose
- Capture durable, repository-specific requirements for RRStack. This file governs design and implementation across iterations. Short-term work items live in stan.todo.md.

Targets and runtime
- Library runs in both Node and browsers.
- Pure library surface (no I/O side effects); suitable for UI, workers, and server.
- ESM/CJS bundles provided via Rollup; types included.

Public API (core types and shapes)
- Interfaces (prefer interfaces; extend where useful; use utility types sparingly):
  - RRStackOptions (constructor input)
    - timezone: string (validated at runtime; narrowed internally)
    - timeUnit?: 'ms' | 's' (default 'ms')
    - rules?: RuleJson[] (default [])
  - RRStackOptionsNormalized (stored on the instance; frozen)
    - extends Omit<RRStackOptions, 'timeUnit' | 'rules' | 'timezone'>
    - timeUnit: 'ms' | 's'
    - rules: RuleJson[]
    - timezone: TimeZoneId (branded, validated string)
  - RRStackJson (serialized shape; flattened)
    - extends RRStackOptionsNormalized
    - version: string (current package version at serialization time)
- JSON persistence
  - toJson(): RRStackJson — writes version as a build-time injected constant; does not import package.json at runtime (browser-friendly).
  - fromJson(json: RRStackJson): RRStack — validates and constructs; future version-based transforms live here; version is NOT stored on the instance.

Options, mutability, and setters
- The instance exposes a single authoritative options object:
  - public readonly options: RRStackOptionsNormalized
  - options is normalized (defaults applied) and frozen.
  - There are NO separate class fields for timezone or rules; they live in options.
- Setters (property-style) and batch update:
  - get timezone(): string; set timezone(tz: string) — validates, freezes new options, recompiles (single pass).
  - get rules(): readonly RuleJson[]; set rules(next: RuleJson[]) — minimal “rule-lite” validation, freeze, recompile.
  - get timeUnit(): 'ms' | 's' — immutable; no setter (changing unit would re-interpret all timestamps).
  - updateOptions(partial: Pick<RRStackOptions, 'timezone' | 'rules'>): void — batch changes with one recompile.
  - Convenience rule mutators (addRule/swap/up/down/top/bottom) remain and delegate to rules update.

Units and domain (no internal ms canonicalization)
- All public inputs/outputs (and internal algorithms) operate in the configured unit end-to-end.
- timeUnit semantics:
  - 'ms': millisecond timestamps (Date.now()) with Luxon millisecond methods.
  - 's': integer seconds; RRULE starts are already second-granular; ends are rounded up to the next integer second to honor [start, end) and avoid boundary false negatives.
- Domain bounds:
  - Eliminate EPOCH_*_MS constants entirely.
  - Internal helpers (not exported):
    - domainMin(unit) = 0
    - domainMax(unit):
      - ms: 8_640_000_000_000_000 (approx max JS Date)
      - s: Math.floor(8_640_000_000_000_000 / 1000) = 8_640_000_000_000

Timezone validation and typing (dependency-driven)
- Validate timezone strings at all entry points (constructor, fromJson, setters) using Luxon:
  - IANAZone.isValidZone(tz) is the primary check.
  - Error messages note that validity depends on ICU/Intl data available to the host environment.
- Narrow timezone to a branded type after validation:
  - TimeZoneId is a zod-branded string; stored in RRStackOptionsNormalized and RRStackJson.
- Provide helpers:
  - RRStack.isValidTimeZone(tz: string): boolean
  - RRStack.asTimeZoneId(tz: string): TimeZoneId (validated/branded)
- Note: Intl.supportedValuesOf('timeZone') may be present in modern browsers and can improve error messaging, but Luxon remains the source of truth.

Core algorithms and behavior
- isActiveAt(t: number): instantStatus — point query in the configured unit.
- getSegments(from?: number, to?: number): Iterable<{ start: number; end: number; status: instantStatus }>
  - Streaming, memory-bounded k-way merge over per-rule boundary streams (starts/ends), using a min-heap.
  - No default output cap; accept an optional per-call limit with explicit throw if exceeded (no silent truncation).
- classifyRange(from: number, to: number): rangeStatus — derived via a lightweight scan over getSegments for the requested window.
- getEffectiveBounds(): { start?: number; end?: number; empty: boolean }
  - Independent of getSegments (and works with undefined start/end).
  - Earliest bound: min-heap of rrule.after() candidate starts across active rules; probe a small forward window to confirm cascaded activation; terminate on first success.
  - Latest bound: mirror with max-heap and rrule.before() probing backward.
  - Open-sided detection based on domainMin/unit and domainMax/unit with targeted coverage probes.
- now(): number — returns current time in configured unit (ms or s).

Compilation and coverage (module split)
- No internal conversion to ms; compile and coverage operate in the configured unit.
- Module layout:
  - compile.ts — unit-aware; returns CompiledRule { tz, unit, … }.
  - coverage/
    - time.ts — unit-aware Date/DateTime conversions; add-duration; horizons; day lengths.
    - patterns.ts — local structural matching helpers (daily and monthly/yearly).
    - enumerate.ts — per-rule enumeration horizons and lazy occurrence generation.
    - coverage.ts — ruleCoversInstant orchestration.
  - sweep.ts — streaming merge for segments; unit-aware; no EPOCH_* usage.

Validation policy (zod)
- Use zod minimally for:
  - RRStackOptions and RRStackJson parsing (constructor/fromJson).
  - Setter/mutation “rule-lite” checks (effect literal, options.freq numeric, starts/ends finite if present); full RRULE Options validation remains in compile.
- Keep schemas small and focused for low overhead in both Node and browser.

Version handling (persistence only)
- Version is only needed at serialization:
  - toJson writes the current package version injected at build time as a constant (e.g., __RRSTACK_VERSION__ replaced by Rollup).
  - The version is not stored on the instance.
- fromJson uses version for future transforms only; none implemented yet in 0.x.

Changelog policy
- Ensure CHANGELOG.md includes ALL commits by configuring auto-changelog in package.json:
  - "auto-changelog": { "output": "CHANGELOG.md", "unreleased": true, "commitLimit": false, "hideCredit": true }
  - Release step runs: npx auto-changelog -p

Documentation
- README documents:
  - RRStackOptions/RRStackJson flattened shapes.
  - timeUnit semantics ('ms' vs 's'); seconds rounding behavior.
  - Timezone validation and environment note (ICU/Intl).
  - Property-style setters and batch update.
  - Streaming segments and bounds behavior.
  - Browser/worker guidance for long windows (yield to UI or use Worker).

Non-functional requirements
- Performance: streaming algorithms are memory-bounded; avoid precomputing large occurrence sets; heap merges scale with actual overlaps.
- Determinism: comparisons use half-open intervals [start, end); 's' mode rounds end upward to avoid boundary false negatives.
- Immutability: options are frozen; mutators perform immutable updates and recompile exactly once per call.

Out of scope (for now)
- Changing timeUnit on an existing instance (re-interpretation) — not supported; construct a new instance instead.
- Full RRULE Options schema validation via zod — compile remains the authoritative validator.
