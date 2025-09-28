# RRStack — Requirements and Development Plan

Last updated: 2025-09-28 (UTC)

## This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

Completed (recent)

- Requirements: integrate a detailed plan for pluggable rule descriptions (descriptor/AST + translators) and reusable frequency lexicon exports, with configuration points, exports, and acceptance criteria. Updated dev plan with prioritized implementation steps.
- Tests(describe): validate that weekday position (“third Tuesday”) and time (“5:00”, “9:00”) appear in rule descriptions (describeRule/describeCompiledRule).

- Refactor(describe): prefer Luxon for date/time formatting; compose strings only
  - formatLocalTime now uses Luxon toFormat in the rule timezone (h12/h23, hm/hms/auto).
  - Month names rendered via Luxon (LLLL) and lower‑cased for strict‑en output.
  - Removed manual hour/meridiem assembly; code focuses on composing phrases.
  - Lint: avoid template interpolation of non‑string/nullable values (String() and conditional appends).
  - No API changes; outputs preserved for existing tests.

- Feat(describe): COUNT/UNTIL phrasing and YEARLY multi‑month lists
  - Append “for N occurrences” when COUNT is present.
  - Append “until YYYY‑MM‑DD” (inclusive start semantics) using descriptor tz/unit.
  - YEARLY with multiple BYMONTH values now yields “in january, march and july …”.
  - Retain existing daily/weekly/monthly/yearly patterns and time formatting.
  - No public API changes; translator remains strict‑en by default with options.

- Feat(describe): weekly and yearly phrasing; list join; lint fix
  - WEEKLY: “on monday, wednesday and friday [at h:mm]” when BYWEEKDAY present.
  - YEARLY:
    - “on july 20 [at h:mm]” for BYMONTH + BYMONTHDAY,
    - “in july on the third tuesday [at h:mm]” for BYMONTH + nth weekday or BYSETPOS+weekday.
  - Lint: use ??= for pluralizer to satisfy prefer-nullish-coalescing.

- Fix(typecheck/lint): handle null values in rrule option arrays and satisfy template‑expression lint
  - asArray helper now accepts null (rrule Options fields may be number | number[] | null), resolving TS2345 in describe.ts.
  - toOrdinal now string‑coerces numeric template literal (restrict‑template‑ expressions), clearing the ESLint error.

- Fix(describe): monthly bysetpos + weekday phrasing and lint cleanups
  - strict-en translator now uses BYSETPOS when weekday lacks an explicit nth, yielding “on the <ordinal> <weekday>” (e.g., “third tuesday”).
  - Address lints: remove unused import in describe.ts; replace enum switch with a numeric map; avoid unnecessary nullish checks and coerce interval to string in templates.

- Feat(describe): minimal strict‑en phrasing to satisfy tests
  - Implemented a targeted, internal description path for:
    - DAILY rules with time → “every day at h:mm”,
    - MONTHLY rules with bysetpos + single weekday → “every month on the <ordinal> <weekday> [at h:mm]”.
  - Fallback remains rrule.toText() for other patterns.
  - No public translator/lexicon API yet; this is a conservative step to make tests pass without changing the broader surface or docs.
  - Kept includeTimeZone/includeBounds behavior unchanged.
  - Next: complete the planned descriptor/translator architecture and frequency lexicon exports, then migrate describeRule/describeCompiledRule to use the pluggable translator by default (strict‑en), preserving current wording for existing scenarios.

- Feat(core): add RRStack.formatInstant(t, opts?) to format an instant using the stack’s configured timezone and timeUnit. Defaults to ISO (suppressing milliseconds); supports { format?: string; locale?: string } via Luxon. Added unit tests for ms/s and a custom format string.

- Feat(core): add DescribeOptions.formatTimeZone to customize the timezone label in rule descriptions. Applied in describeCompiledRule for both recurring and span rules when includeTimeZone is true. Added tests for recurring and span paths.

- Feat(core/react): allow rrstack.addRule() to be called with no arguments. Defaults to an active, open-ended span rule: `{ effect: 'active', options: {} }`. Updated both core RRStack.addRule and the React façade to mirror behavior. Added a unit test covering the no-arg case.
- Docs: align React hooks to single-options signatures across README and Handbook; update bullets and examples for:
  - useRRStack({ json, onChange?, resetKey?, changeDebounce?, mutateDebounce?, renderDebounce?, logger? }) → { rrstack, version, flushChanges, flushMutations, cancelMutations, flushRender } - useRRStackSelector({ rrstack, selector, isEqual?, renderDebounce?, logger?, resetKey? }) → { selection, version, flushRender }
- Docs: fix installation/JSON Schema code fences in README.
- Docs: add “Span rules” and “Baseline (defaultEffect)” sections to Handbook Overview; add baseline section to Algorithms page.
- React hooks:
  - Add shared UseRRStackBaseProps (renderDebounce, logger, resetKey) and UseRRStackBaseOutput (version, flushRender) to keep hook APIs aligned.
  - UseRRStackProps/Output now extend the shared base types (no behavior change).
  - useRRStackSelector:
    - Switch to single options-object signature: { rrstack, selector, isEqual?, renderDebounce?, logger?, resetKey? }.
    - Return { selection, version, flushRender } to match useRRStack naming.
    - Support renderDebounce with identical semantics to useRRStack (trailing always true; optional leading; default 50 ms via shared constants).
    - Logger parity (init/reset/mutate/flushRender) via shared createLogger.
- Tests(react): align useRRStack tests to new single-options signature ({ json, onChange?, ... }); update selector usage; resolves TS2554/TS2345.
- Perf(core): 100× faster effective-bounds
  - Open-end detection is now O(1), purely by stack inspection (no far-future rrule scans). The cascade is open-ended iff the last open-ended candidate is an active source (active open span, infinite active recurrence with any start, or baseline active). A blackout open-ended span closes the future.
  - Latest bound computation is finite/local. It derives a finite cutoff from the last open-ended blackout span (if present) and only inspects finite contributors (spans, count-limited recurrences, until-limited recurrences).
  - getEffectiveBounds now computes earliest → open-end → latest; emptiness is decided without probing the far future.
  - Latest end details:
    - Short-circuit to the finite probe when the cascade is active immediately before it (probe is the latest end).
    - In recurrence backstep, use strict e > cursor to avoid skipping the final day when end == probe.
    - If the bounded reverse sweep finds no earlier transition, return the probe.- Docs(handbook/react): ensure examples include changeDebounce, mutateDebounce, and renderDebounce with inline explanations across examples.
- Docs(handbook): add “Algorithms (deep dive)” page covering isActiveAt, getSegments, classifyRange, and getEffectiveBounds.
- Docs(handbook/react): add debounced form control examples (controlled and uncontrolled); enumerate useRRStack options and outputs.- Policy(project): record “never bump package version or edit CHANGELOG.md” in stan.project.md (release workflow owns them).
- Feat(react): replace apply/applyDebounce with mutateDebounce (proxy/staging) - All rrstack mutators/assignments are staged and committed once per window. - Add flushMutations()/cancelMutations(); staged reads overlay rules/timezone; queries remain compiled-only until commit.
- API rename: debounce → changeDebounce; flush() → flushChanges().
- Simplify debouncers: trailing always true; options accept true|number|{ delay?, leading? }.
- Feat(react): renderDebounce simplified (final paint always; optional leading).
- Docs: README/Handbook updated with new options/helpers and staged-vs-compiled notes.
- Chore(tests): follow-up pending to adapt or extend tests for mutateDebounce semantics.
- Chore(lint): replace unsafe any[] spread in normalizeOptions with RuleLiteSchema-based coercion to RuleJson[].
- Fix(types): coalesce defaulted optionals in normalizeOptions (timeUnit, defaultEffect, rules) to satisfy RRStackOptionsNormalized (TS-safe).
- Fix(schema gen): preserve 'rules' as optional with default in generator (extend) so the JSON Schema only requires 'timezone'.- Feat(schema): make all defaulted top-level properties optional (timeUnit, defaultEffect, rules) and regenerate JSON Schema (only 'timezone' required).
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
- Fix(react): complete src/react/mutateFacade.ts to resolve parser error and align with staging/commit semantics (RefObject, typed spreads, top/bottom/set).

- Tests(react): migrate useRRStack tests to new API/semantics:
  - debounce → changeDebounce; flush() → flushChanges().
  - Leading debounce now includes a final trailing autosave; expectations updated.
  - Harden tests against dev double-invocation of effects (React 18/19): guard rrstack.addRule bursts in useEffect with once flags to avoid duplicate mutations during mount in test environment.
- Docs: update README and handbook/react.md to reflect changeDebounce / mutateDebounce / renderDebounce and new helpers (flushChanges, flushMutations, cancelMutations, flushRender). Note staged vs compiled behavior and migration notes.
- Lint: address prefer-nullish-coalescing in useRRStack.ts (use ??= for singleton initializations of debouncers/managers).

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

  re-run knip to confirm no unused files remain under src/react. The orchestrator now consumes the extracted modules; hooks files should no longer be reported as unused.

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

E. Description & frequency lexicon (immediate) (Top priority; implement before other refactors unless blocked)

1. Descriptor (AST) builder
   - New: src/rrstack/describe/descriptor.ts
   - buildRuleDescriptor(compiled: CompiledRule) => RuleDescriptor
   - Normalize lists; convert rrule Weekday to { weekday: 1..7, nth?: number }.
   - Include clamps, count/until, wkst when present.

2. strict-en translator
   - New: src/rrstack/describe/translate.strict.en.ts
   - export strictEnTranslator(desc, opts)
   - Helpers:
     - ordinal strings (long/short), last= -1
     - weekday/month names
     - list formatting (and/commas)
     - time formatting (hm/hms; h23/h12)
     - setpos phrasing (“select the 1st and 3rd occurrence” when needed)
   - Interval phrasing:
     - interval === 1 → noun: “every year/month/week/day/hour/minute/second”
     - interval > 1 → “every N {plural(noun)}” using pluralizer

3. Frequency lexicon exports
   - New: src/rrstack/describe/lexicon.ts
   - Types: FrequencyAdjectiveLabels, FrequencyNounLabels, FrequencyLexicon
   - Constants: FREQUENCY_ADJECTIVE_EN, FREQUENCY_NOUN_EN, FREQUENCY_LEXICON_EN
   - UI helper: toFrequencyOptions(labels?: FrequencyAdjectiveLabels)
   - Re-export from package root.

4. Wiring and options
   - Update src/rrstack/describe.ts:
     - compile → descriptor → translator (resolved by precedence)
     - Default translator: strict-en with EN lexicons
     - Respect includeTimeZone/includeBounds/formatTimeZone via TranslatorOptions
   - Extend DescribeOptions with translator / translatorOptions.
   - Optionally extend RRStackOptions with instance-level describe?: { translator?: id|fn; translatorOptions?: TranslatorOptions } (do not serialize functions).

5. Tests
   - Fix current failures (ensure “third” and “9:00” appear).
   - Add table tests for interval 1 vs > 1, nth weekday (incl. last), BYSETPOS lists, count vs until, timeFormat/hourCycle variants, multiple constraints.

6. Docs
   - README/Handbook: “Descriptions: pluggable translators” and “Frequency labels for UI”.
   - Document exports and config usage; note that translator functions are not serialized.

Status:

- Phase 0 (minimal): DONE — daily time and monthly nth-weekday phrasing for tests; full descriptor/translator work remains.
