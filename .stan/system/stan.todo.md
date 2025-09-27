# RRStack — Requirements and Development Plan

Last updated: 2025-09-27 (UTC)

## This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

Completed (recent)

- Docs: align React hooks to single-options signatures across README and
  Handbook; update bullets and examples for:
  - useRRStack({ json, onChange?, resetKey?, changeDebounce?, mutateDebounce?,
    renderDebounce?, logger? }) → { rrstack, version, flushChanges,
    flushMutations, cancelMutations, flushRender }
  - useRRStackSelector({ rrstack, selector, isEqual?, renderDebounce?, logger?,
    resetKey? }) → { selection, version, flushRender }
- Docs: fix installation/JSON Schema code fences in README.
- Docs: add “Span rules” and “Baseline (defaultEffect)” sections to Handbook
  Overview; add baseline section to Algorithms page.
- React hooks:
  - Add shared UseRRStackBaseProps (renderDebounce, logger, resetKey) and
    UseRRStackBaseOutput (version, flushRender) to keep hook APIs aligned.
  - UseRRStackProps/Output now extend the shared base types (no behavior change).
  - useRRStackSelector:
    - Switch to single options-object signature:
      { rrstack, selector, isEqual?, renderDebounce?, logger?, resetKey? }.
    - Return { selection, version, flushRender } to match useRRStack naming.
    - Support renderDebounce with identical semantics to useRRStack (trailing
      always true; optional leading; default 50 ms via shared constants).
    - Logger parity (init/reset/mutate/flushRender) via shared createLogger.
- Tests(react): align useRRStack tests to new single-options signature
  ({ json, onChange?, ... }); update selector usage; resolves TS2554/TS2345.
- Perf(core): 100× faster effective-bounds
  - Open-end detection is now O(1), purely by stack inspection (no far-future
    rrule scans). The cascade is open-ended iff the last open-ended candidate
    is an active source (active open span, infinite active recurrence with any
    start, or baseline active). A blackout open-ended span closes the future.
  - Latest bound computation is finite/local. It derives a finite cutoff from
    the last open-ended blackout span (if present) and only inspects finite
    contributors (spans, count-limited recurrences, until-limited recurrences).
  - getEffectiveBounds now computes earliest → open-end → latest; emptiness is
    decided without probing the far future.
  - Latest end details:
    - Short-circuit to the finite probe when the cascade is active immediately
      before it (probe is the latest end).
    - In recurrence backstep, use strict e > cursor to avoid skipping the final
      day when end == probe.
    - If the bounded reverse sweep finds no earlier transition, return the probe.- Docs(handbook/react): ensure examples include changeDebounce, mutateDebounce,
      and renderDebounce with inline explanations across examples.
- Docs(handbook): add “Algorithms (deep dive)” page covering isActiveAt,
  getSegments, classifyRange, and getEffectiveBounds.
- Docs(handbook/react): add debounced form control examples (controlled and uncontrolled); enumerate useRRStack options and outputs.- Policy(project): record “never bump package version or edit CHANGELOG.md” in stan.project.md (release workflow owns them).
- Feat(react): replace apply/applyDebounce with mutateDebounce (proxy/staging) - All rrstack mutators/assignments are staged and committed once per window. - Add flushMutations()/cancelMutations(); staged reads overlay rules/timezone; queries remain compiled-only until commit.
- API rename: debounce → changeDebounce; flush() → flushChanges().
- Simplify debouncers: trailing always true; options accept true|number|{ delay?, leading? }.
- Feat(react): renderDebounce simplified (final paint always; optional leading).
- Docs: README/Handbook updated with new options/helpers and staged-vs-compiled notes.
- Chore(tests): follow-up pending to adapt or extend tests for mutateDebounce semantics.
- Chore(lint): replace unsafe any[] spread in normalizeOptions with
  RuleLiteSchema-based coercion to RuleJson[].
- Fix(types): coalesce defaulted optionals in normalizeOptions (timeUnit,
  defaultEffect, rules) to satisfy RRStackOptionsNormalized (TS-safe).
- Fix(schema gen): preserve 'rules' as optional with default in generator
  (extend) so the JSON Schema only requires 'timezone'.- Feat(schema): make all defaulted top-level properties optional (timeUnit, defaultEffect, rules) and regenerate JSON Schema (only 'timezone' required).
- Tests: add segment and classifyRange cases under defaultEffect baseline to exercise streaming and classification with a baseline.
- Docs: README “JSON Shapes and Types” now includes defaultEffect with a brief baseline semantics note.- Chore(lint): escape '>' in TSDoc for baselineEffect to clear tsdoc/syntax warnings.
- Fix(core): include defaultEffect when freezing updated options in RRStack setters (timezone, rules, updateOptions) and refine baselineEffect to satisfy lint (no-unnecessary-condition).
- Feat(core): add RRStackOptions.defaultEffect ('active' | 'blackout' | 'auto', default 'auto') and implement a virtual baseline span rule prepended at query time. All query surfaces (isActiveAt, getSegments, classifyRange, getEffectiveBounds) now respect the baseline without algorithm changes. JSON schema, normalization, persistence, and tests updated.

- Fix(react/lint+types): resolve ESLint/TS issues to stabilize CI:
  - use RefObject in small helpers (changeEmitter, renderBump) to satisfy deprecation rule.
  - complete react/mutateFacade (fix parse error; add top/bottom/set traps); cast RuleJson[] to avoid unsafe spread warnings.
  - quiet TSDoc escape warnings in useRRStack by switching to regular comments in problematic sections; prefer ?? in staged getters; suppress unused Proxy receiver param.
  - test: narrow lint scope by disabling a single rule in useRRStack.test.ts.
  - No behavior changes to core scheduling algorithms.

- Fix(react): remove stray file at b/src/react/mutateFacade.ts (erroneous path).
- Fix(react): complete src/react/mutateFacade.ts to resolve parser error and
  align with staging/commit semantics (RefObject, typed spreads, top/bottom/set).

- Tests(react): migrate useRRStack tests to new API/semantics:
  - debounce → changeDebounce; flush() → flushChanges().
  - Leading debounce now includes a final trailing autosave; expectations updated.
  - Harden tests against dev double-invocation of effects (React 18/19):
    guard rrstack.addRule bursts in useEffect with once flags to avoid
    duplicate mutations during mount in test environment.
- Docs: update README and handbook/react.md to reflect changeDebounce /
  mutateDebounce / renderDebounce and new helpers (flushChanges,
  flushMutations, cancelMutations, flushRender). Note staged vs compiled
  behavior and migration notes.
- Lint: address prefer-nullish-coalescing in useRRStack.ts (use ??= for
  singleton initializations of debouncers/managers).

---

0. Top Priority — Stabilize template baseline (pre-implementation) [unchanged]

---

1. Requirements (confirmed)

- Options
  - RRStackOptions (input/serialized): { version?; timezone; timeUnit? = 'ms'; rules? = [] }
  - RRStackOptionsNormalized (stored): extends Omit<…> with timeUnit required, rules required, timezone: TimeZoneId (branded).
- Timezones
  - Validate with Luxon IANAZone.isValidZone; store branded TimeZoneId; helpers asTimeZoneId/isValidTimeZone.
- Units
  - No internal ms canonicalization; operate fully in configured unit.
  - 's' mode uses integer seconds with end rounded up to honor [start, end).
  - Eliminate EPOCH\_\*\_MS; domainMin/unit = 0; domainMax/unit from JS Date limits.
- Algorithms
  - Streaming getSegments via heap-based boundary merge; memory-bounded; no default cap (optional per-call limit).
  - getEffectiveBounds independent of getSegments; heap-based earliest/latest with window probes; open-side detection.
- Mutability
  - options frozen; property setters for timezone/rules; batch update via updateOptions; timeUnit immutable.
- Persistence/version
  - toJson writes build-injected version; constructor accepts and ignores version; no fromJson API; transforms may be added later if needed.
- Module split
  - coverage/{time.ts, patterns.ts, enumerate.ts, coverage.ts}; unit-aware compile/sweep.

---

2. External dependencies (Open-Source First)

- Luxon (tz/duration), rrule (recurrence), zod (minimal validation).
- Keep zod usage small to preserve bundle size; consider optional “lite” validators later if needed.

---

3. Public contracts (service-first; ports)

- No side effects; pure services.
- Thin adapters (future CLI/UI) will map to these services 1:1.

---

4. Core algorithms

- Compile JSON → RRule options with tzid, dtstart/until (unit-aware).
- Coverage with unit-aware helpers; structural fallbacks for daily and monthly/yearly patterns.
- Streaming segments (heap merge).
- Independent bounds (heap + window probes).

---

5. Module split (services-first; keep files short)

- Implement coverage split as specified; keep files cohesive and well under 300 LOC.

---

6. Validation & constraints

- Zod schemas:
  - RRStackOptions (constructor).
  - Rule-lite checks on mutations (effect literal, options.freq string, starts/ends finite if present); full RRULE Options validation remains in compile.

---

7. Tests (status)

- Added:
  - bounds.open.test.ts, bounds.closed.test.ts, heap.test.ts, seconds.unit.test.ts.
- Pending:
  - None at this time; expand as new features land.

---

8. Long-file scan (source files > ~300 LOC)

- src/rrstack/RRStack.ts reduced; further reductions possible if needed after future features.
- Completed: split of src/rrstack/sweep.ts into src/rrstack/segments.ts and src/rrstack/bounds.ts; introduced src/rrstack/util/heap.ts; sweep.ts is a façade. Keep modules focused and short.

---

9. Next steps (implementation plan)

A. Decompose useRRStack (keep hook < ~200 LOC)

- Extract cohesive modules under src/react/hooks:
  1. useRRStack.config.ts — debounce defaults + option parsing (true|number|{ delay?, leading? } → { delay, leading }).
  2. useRRStack.onChange.ts — changeDebounce + flushChanges().
  3. useRRStack.mutate.ts — staging manager for mutateDebounce (rules/timezone snapshot, schedule/flush/cancel).
  4. useRRStack.render.ts — renderDebounce + flushRender().
  5. useRRStack.facade.ts — Proxy façade overlay (staged rules/timezone/toJson; intercept mutators/assignments).
  6. useRRStack.logger.ts — typed logger ('init'|'reset'|'mutate'|'commit'|'flushChanges'|'flushMutations'|'flushRender'|'cancel').
  7. react/useRRStack.ts — thin orchestrator wiring modules; returns { rrstack, version, flushChanges, flushMutations, cancelMutations, flushRender }.
- Prefer existing helpers (changeEmitter, renderBump, mutateFacade) where they align; migrate/rename into hooks/\* to match the plan.

  re-run knip to confirm no unused files remain under src/react. The orchestrator
  now consumes the extracted modules; hooks files should no longer be reported
  as unused.

B. Update exports and fix type surfaces

- Ensure src/react/index.ts exports only stable API (useRRStack, useRRStackSelector). No stray DebounceOption types.

C. Tests to new API/semantics

- Replace debounce → changeDebounce; applyDebounce → mutateDebounce; flush() → flushChanges().
- Remove apply/applyDebounce tests; add mutateDebounce coverage (staging reads vs compiled queries; single commit per window; autosave coalesced).
- Keep renderDebounce tests and assert trailing paint (leading implies eventual trailing).

D. Docs

- README: keep intro/quick start lean; move detailed React content to handbook/react.md.
- Handbook: document option shapes, defaults, staged-vs-compiled behavior, migration notes (0.11.0).
- Bounds: document probe-free open-end detection and finite latest-end strategy.

