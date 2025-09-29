# RRStack — Requirements and Development Plan

Last updated: 2025-09-28 (UTC)

## This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It is kept current across iterations.

Next up (near‑term, prioritized)

1. Perf & profiling (BENCH gated; resume now)
   - Extend micro‑bench coverage - monthly “nth weekday” open/closed; yearly bymonthday; count‑limited recurrences; blackout overlays and tie‑at‑boundary for latest‑end reverse sweep.
   - Developer docs - short section (Handbook → Algorithms) describing how to run BENCH and interpret ops/s.
   - Handbook → Performance: how to run benches, read ops/s, environment variance caveats; include brief addRule guidance (batching vs growth).
   - Optional - consider tinybench only if richer stats are needed; explore an internal diagnostic knob (test builds) for probe/backstep counters.
   - Added in this iteration: • getEffectiveBounds: daily count-limited (finite series) and reverse-sweep stress (ambiguous pre-pass). • Overlay scenario (active + blackout slice): getSegments/classifyRange over 1-day window. • getEffectiveBounds: monthly nth-weekday (closed-sided) and yearly bymonthday (count-limited).
   - Next: • Consider parameterized horizons or table-driven benches for families (daily/monthly/yearly). • Capture perf snapshots across Node versions to a markdown table in docs (manual for now).
   - Add an “add-replace” bench that holds rule count constant (replace last/index) to compare fairly with growing addRule.
   - Compare addRule immediate vs staged (mutateDebounce enabled); document the delta; include flushMutations/flushChanges path in benches.
   - Parameterize bounds benches (e.g., monthly intervals, window widths); optionally table‑drive scenarios.
   - React mutators: added benches for removeRule, swap, up, down, top, bottom to compare façade operation costs. Note: addRule appears slower primarily because the bench grows the rules array (full recompile cost scales with array length) and commits each mutation immediately (no staging).

2. Docs & examples (priority)
   - Handbook/README: “Descriptions: pluggable translators” with examples covering:
     - Daily at time, weekly multiple days, monthly nth weekday (incl. last), monthly by‑month‑day,
     - Yearly with single and multiple months,
     - COUNT/UNTIL phrasing, hourCycle/timeFormat/ordinals/locale options,
     - Frequency lexicon usage (custom labels) and toFrequencyOptions for UI.
   - Note default includeTimeZone=false (opt‑in) and when to include it.
   - Brief “how to choose translator” note; point to strict‑en defaults and translatorOptions.
   - Defer Typedoc warning cleanup (e.g., WeekdayPos visibility) until later.

3. React hooks polish
   - Re‑run knip to confirm no unused files under src/react/\*\*.
   - Ensure exports remain limited to { useRRStack, useRRStackSelector } plus minimal types (DebounceSpec, UseRRStack\* where appropriate).
   - Tests: add focused cases for mutateDebounce staging vs compiled queries and renderDebounce leading+trailing.
   - Add short cookbook snippets in Handbook (Editor patterns: uncontrolled vs controlled, flush\* usage).

4. Perf & profiling (BENCH gated; resume later)
   - Extend micro‑bench coverage - monthly “nth weekday” open/closed; yearly bymonthday; count‑limited recurrences; blackout overlays and tie‑at‑boundary for latest‑end reverse sweep.
   - Developer docs - short section (Handbook → Algorithms) describing how to run BENCH and interpret ops/s.
   - Optional - consider tinybench only if richer stats are needed; explore an internal diagnostic knob (test builds) for probe/backstep counters.
   - Optional CI: on‑demand bench job to archive results; simple markdown snapshot per Node version for reference.

Backlog / DX

- Typedoc warnings (descriptor subtype/WeekdayPos visibility) — low priority; address with targeted export/docs entries when we polish docs.

---

Additional docs (bounds; staged vs compiled)

- Bounds section: ensure “probe‑free open‑end detection” and “finite/local latest‑bound” are explained with one or two succinct scenarios.
- React Handbook: staged vs compiled reads (rules/timezone/toJson overlay), with Save‑now and leading/trailing debounce discussion.

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

- Fix(react/useRRStack): make hook robust to null/undefined json by falling back to a safe default ({ timezone: 'UTC', rules: [] }). Added tests covering null and undefined inputs.

- Fix(describe/strict-en): default to short ordinals for BYMONTHDAY lists (monthly/yearly) so output renders “on the 1st, 15th …” and “on the 2nd and 15th …” as expected by tests and UI. Keep long ordinals for weekday positions (e.g., “third tuesday”, “last tuesday”).

- Perf(bench, node-only): add mutator micro‑benches under src/rrstack/perf.mutators.bench.ts with fixed pre‑states: add first (0→1), add second (1→2), remove last (1→0), swap(0,last), up(last), down(0), top(last), bottom(0).
- Perf(bench, react): replace single “addRule (immediate)” bench with two benches that add the first rule and the second rule respectively, so results align with Node-only mutator benches and fixed pre‑states.

- Describe(strict-en): support yearly with month(s) + weekday(s) without position (no nth/setpos):
  - Single month: “in april on thursday …”
  - Multiple months: “in january, april … on thursday …”
  - Time-of-day appended when present.

- Describe(strict-en): enumerate multiple BYMONTHDAY and times
  - Monthly/yearly: render “on the 1st, 15th and 28th …” for BYMONTHDAY lists.
  - Time-of-day: render lists like “at 9:00 and 17:00” when BYHOUR or BYMINUTE contains multiple values (common shapes). Falls back to a single time for mixed/complex shapes.
  - Tests added under describe.more.test.ts.

- Tests(describe): add RRStack.describeRule span + includeBounds coverage (ms and 's' units).
  - Confirms that “Active continuously [from …; until …]” appears when includeBounds=true and starts/ends are present on span rules.
  - Downstream triage notes: ensure rule edits recompile (replace rules array or use mutators) and pass timestamps in the configured unit (e.g., seconds when timeUnit='s'); unit mismatch can yield invalid ISO formatting and hide bounds in the description.

- Fix(lint): coerce numeric template expression in src/react/perf.react.bench.ts (shrink label) to String(i) to satisfy @typescript-eslint/restrict-template-expressions.
- Perf(tests): add BENCH-gated micro-benchmarks for core algorithms (baseline active; daily open-ended; daily closed 30d; light isActiveAt/getSegments/classifyRange); skipped by default; sanity asserts always run.
- Fix(lint): coerce numeric template expressions to string in strict-en translator (restrict-template-expressions).
- Feat(describe): derive localized weekday/month names via Luxon; options for locale/lowercase; strict-en remains lower-case default.
- Tests(describe): validate weekday position (“third Tuesday”) and time (“5:00”, “9:00”) appear in rule descriptions.
- Refactor(describe): move describe.ts into describe/index.ts to establish a module entry; update internal imports; public API remains './describe'.
- Fix(bench/sanity): make “daily open end” sanity case use baseline blackout
  - Using defaultEffect: 'active' made the cascade open-start (earliest undefined).
  - Switched to defaultEffect: 'blackout' to assert a finite earliest start while keeping the end open; leaves BENCH-gated timing unaffected.
- Setup(bench): first-class vitest bench integration
  - vitest.config.ts: added benchmark.include = ['src/**/*.bench.ts'].
  - package.json: new script "bench": "vitest bench".
  - stan.config.yml: added "bench: npm run bench" after "test".
  - New suite: src/rrstack/perf.rrstack.bench.ts - getEffectiveBounds: baseline active, daily open-end, daily 30d closed, monthly 3rd Tue open-end. - isActiveAt: baseline active (sampled). - getSegments: daily rule over 1-day window. - classifyRange: daily hour + baseline active.
  - Benchmarks are isolated from unit tests and run with `npm run bench`.

- Fix(bench/react): wrap hook updates in act and enable act env
  - Set IS_REACT_ACT_ENVIRONMENT and wrapped root.render/addRule/setRules in act() to silence warnings and keep benches deterministic.

- Docs(description/lexicon): export FrequencyAdjectiveLabels, FrequencyNounLabels, FrequencyLexicon, OrdinalStyle, and RuleDescriptor from the package root to include them in Typedoc; clears warnings about referenced-but-missing types.

- Docs(description/lexicon): export RuleDescriptorRecur and RuleDescriptorSpan from the package root to include descriptor subtypes in Typedoc; clears remaining warnings referencing RuleDescriptor.

- Describe(strict-en): add monthly BYMONTHDAY phrasing (“every month on the 15th …”) and extend tests:
  - COUNT/UNTIL phrasing (“for N occurrences”, “until YYYY-MM-DD”).
  - Yearly multi-month phrasing (“in january, march and july …”).
  - Monthly last weekday via nth(-1) (“on the last tuesday …”).
  - Monthly BYSETPOS single case (“on the third tuesday …”).

- API convention: set DescribeOptions.includeTimeZone default to false (boolean defaults policy) and updated tests/requirements accordingly.
- Profiling: extended benches (daily count-limited, reverse-sweep, overlay segments/classification).

— Description & frequency lexicon wrap‑up —

- Descriptor (AST) builder in place; normalized lists; Weekday → { weekday: 1..7; nth?: ±1..±5 }; clamps (unit epoch), count, until, wkst captured.
- strict‑en translator covers: daily (time), weekly (weekday lists), monthly (nth weekday, last weekday, by‑month‑day), yearly (single/multiple months + variants), interval phrasing, COUNT/UNTIL; time formatting and ordinals configurable; locale/hourCycle supported.
- Frequency lexicon exports provided (constants, types, toFrequencyOptions); package‑root re‑exports in place.
- Wiring complete (compile → descriptor → translator); DescribeOptions respected; translatorOptions exposed. Acceptance tests added.
- Remaining docs (Handbook/README) scheduled under “Docs & examples”.
