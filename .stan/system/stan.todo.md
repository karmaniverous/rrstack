# RRStack — Requirements and Development Plan

Last updated: 2025-09-28 (UTC)

## This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It is kept current across iterations.

Next up (near‑term, prioritized)

1. Description & frequency lexicon (complete the pluggable system)
   - Descriptor (AST) builder • new module src/rrstack/describe/descriptor.ts • buildRuleDescriptor(compiled: CompiledRule) => RuleDescriptor • Normalize lists; convert rrule Weekday to { weekday: 1..7; nth?: ±1..±5 }. • Include clamps (unit epoch), count, until, wkst when present.
   - strict‑en translator • new module src/rrstack/describe/translate.strict.en.ts (already present; extend as needed) • ordinal strings (long/short; last = -1), weekday/month names via Luxon, list joins, time formatting (hm/hms; h23/h12), bysetpos phrasing. • Interval phrasing: interval === 1 → noun (“every month/day”); > 1 → “every N {plural}”.
   - Frequency lexicon exports • src/rrstack/describe/lexicon.ts — FREQUENCY\_\* constants, types, toFrequencyOptions(labels?). • Re-export from package root (already done; ensure stable API).
   - Wiring and options • src/rrstack/describe/index.ts — compile → descriptor → translator (respect includeTimeZone/includeBounds/formatTimeZone; expose translatorOptions). • Per-call override via DescribeOptions; instance defaults (non-serialized) remain optional.
   - Tests • Keep acceptance: “third tuesday at 5:00” and “daily at 9:00” cases; add COUNT/UNTIL, multi‑month yearly, weekday-last, and setpos lists.
   - Docs • README/Handbook: “Descriptions: pluggable translators” + “Frequency labels for UI”.

2. Perf & profiling (BENCH gated)
   - Extend micro‑bench coverage • monthly “nth weekday” open/closed; yearly bymonthday; count‑limited recurrences. • blackout overlays and tie-at-boundary cases to exercise latest‑end reverse sweep.
   - Developer docs • Add a short section (Handbook → Algorithms) describing how to run BENCH and read ops/s.
   - Optional • Consider tinybench only if we need richer stats; otherwise keep zero‑dep. • Explore an internal diagnostic knob (test builds only) to surface probe/backstep counters for attribution.

3. React hooks polish
   - Re-run knip to confirm no unused files under src/react/\*\*.
   - Ensure exports are stable and limited to { useRRStack, useRRStackSelector, types: DebounceSpec, UseRRStack\* (as needed) } — no stray experimental types.
   - Tests • Add a couple of focused cases for mutateDebounce staging vs compiled queries and renderDebounce leading+trailing.

4. Docs & examples
   - Handbook: elaborate staged‑vs‑compiled reading for rrstack.rules/timezone/toJson with mutateDebounce.
   - Bounds section: ensure “probe‑free open‑end detection” and “finite/local latest-bound” are explained with one or two succinct scenarios.

5. Quality gates
   - Keep ESLint clean (notably template-expression rules in tests/bench).
   - Maintain coverage while adding translator and perf code.

---

0. Top Priority — Stabilize template baseline (pre-implementation) [unchanged]

---

1. Requirements (confirmed)

- Options
  - RRStackOptions (input/serialized): { version?; timezone; timeUnit? = 'ms'; defaultEffect? = 'auto'; rules? = [] }
  - RRStackOptionsNormalized (stored): extends Omit<…> with timeUnit required, rules required, timezone: TimeZoneId (branded), defaultEffect present.
- Timezones
  - Validate with Luxon IANAZone.isValidZone; store branded TimeZoneId; helpers asTimeZoneId/isValidTimeZone.
- Units
  - No internal ms canonicalization; operate fully in the configured unit.
  - 's' mode uses integer seconds with end rounded up to honor [start, end).
  - domainMin = 0; domainMax derived from JS Date limits (unit-aware).
- Algorithms
  - Streaming getSegments via boundary merge; memory-bounded; optional per-call limit (throw if exceeded).
  - getEffectiveBounds independent of getSegments; earliest forward sweep; O(1) open-end detection; latest finite/local reverse sweep (no far-future scans).
- Mutability
  - options frozen; property setters for timezone/rules; batch update via updateOptions; timeUnit immutable.
- Persistence/version
  - toJson writes build-injected version; constructor ignores version; future transforms remain compatible.
- Module split
  - coverage/{time.ts, patterns.ts, enumerate.ts, coverage.ts}; compile/sweep are unit-aware. Keep modules cohesive and short.
- Baseline
  - defaultEffect provides a virtual open-ended span rule prepended to the cascade (lowest priority) and applies to all queries.

---

2. External dependencies (Open‑Source First)

- Luxon (tz/duration), rrule (recurrence), zod (minimal validation).
- Keep zod usage small to preserve bundle size; avoid introducing heavy deps unless justified.

---

3. Public contracts (services-first; ports)

- Pure library (no I/O); thin adapters (e.g., React hooks) map UI concerns to service calls.

---

4. Core algorithms

- Compile JSON → rrule Options with tzid, dtstart (from starts/domainMin), until (from ends), unit-aware.
- Coverage helpers perform correct tz arithmetic and integer-second rounding when needed.

---

5. Module split (services-first; keep files short)

- Prefer small, focused modules; refactor when approaching ~300 LOC.

---

6. Validation & constraints

- Zod schemas:
  - OptionsSchema for constructor input.
  - RuleLiteSchema for mutators; full validation remains in compile.

---

7. Tests (status)

- Broad coverage across DST, bounds (open/closed/ties), streaming, classification, React hooks, schema.
- BENCH-gated tests live under src/rrstack/perf.\*.test.ts; skipped in CI.

---

8. Long-file scan (source files > ~300 LOC)

- src/rrstack/RRStack.ts is within guidance; keep watching cumulative growth.
- Split sweep into segments/bounds/util/heap (complete); continue to guard for cohesion.

---

9. Implementation plan (tracking)

A. Decompose useRRStack (keep hook < ~200 LOC)

- Extract/configure:
  1. useRRStack.config.ts — debounce normalization (true|number|{ delay?, leading? } → { delay, leading })
  2. useRRStack.onChange.ts — changeDebounce + flushChanges()
  3. useRRStack.mutate.ts — staging manager (schedule/flush/cancel)
  4. useRRStack.render.ts — renderDebounce + flushRender()
  5. useRRStack.facade.ts — Proxy overlay (staged reads; intercept mutators/assignments)
  6. useRRStack.logger.ts — structured events ('init'|'reset'|'mutate'|'commit'|'flushChanges'|'flushMutations'|'flushRender'|'cancel')
  7. useRRStack.ts — thin orchestrator; returns { rrstack, version, flush\* }
- Re-run knip to confirm no unused files remain in src/react.

B. Update exports and fix type surfaces

- Keep only stable exports (useRRStack, useRRStackSelector; minimal types).

C. Tests to new API/semantics

- Replace debounce → changeDebounce; applyDebounce → mutateDebounce; flush() → flushChanges().
- Add staging vs compiled query checks; renderDebounce leading+trailing.

D. Docs

- README: keep quick start lean; move details to Handbook (React).
- Algorithms: document probe-free open-end detection and finite latest-end.

E. Description & frequency lexicon (see “Next up” #1)

- Status: Phase 0 (minimal) DONE — full descriptor/translator work remains.

---

Completed (recent)

- Perf(tests): add BENCH-gated micro-benchmarks for core algorithms (baseline active; daily open-ended; daily closed 30d; light isActiveAt/getSegments/classifyRange); skipped by default; sanity asserts always run.
- Fix(lint): coerce numeric template expressions to string in strict-en translator (restrict-template-expressions).
- Feat(describe): derive localized weekday/month names via Luxon; options for locale/lowercase; strict-en remains lower-case default.
- Tests(describe): validate weekday position (“third Tuesday”) and time (“5:00”, “9:00”) appear in rule descriptions.
- Refactor(describe): move describe.ts into describe/index.ts to establish a module entry; update internal imports; public API remains './describe'.
- Fix(bench/sanity): make “daily open end” sanity case use baseline blackout
  - Using defaultEffect: 'active' made the cascade open-start (earliest undefined).
  - Switched to defaultEffect: 'blackout' to assert a finite earliest start
    while keeping the end open; leaves BENCH-gated timing unaffected.- Setup(bench): first-class vitest bench integration
  - vitest.config.ts: added benchmark.include = ['src/**/*.bench.ts'].
  - package.json: new script "bench": "vitest bench".
  - stan.config.yml: added "bench: npm run bench" after "test".
  - New suite: src/rrstack/perf.rrstack.bench.ts
    • getEffectiveBounds: baseline active, daily open-end, daily 30d closed, monthly 3rd Tue open-end.
    • isActiveAt: baseline active (sampled).
    • getSegments: daily rule over 1-day window.
    • classifyRange: daily hour + baseline active.
  - Benchmarks are isolated from unit tests and run with `npm run bench`.
