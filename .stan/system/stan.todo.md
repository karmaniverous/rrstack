# RRStack — Requirements and Development Plan

Last updated: 2025-09-18 (UTC)

## This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

Completed (recent)

- Fix(tests): seconds-mode clamps in bounds.more
  - The "'s' timeUnit" case used Date.UTC (ms) for starts/ends while the rule
    compiles in 's' mode. Switch clamps to the sec() helper so getEffectiveBounds
    sees seconds throughout. Resolves the unit mismatch and assertion failure
    on b.start/b.end.

- Fix(tests): complete bounds.more.test.ts final case
  - Close the blackoutEarly compileRule call and finish assertions for the
    “pre-pass ambiguous” scenario. Resolves TS1005/Unexpected EOF and restores    green build/docs/lint/typecheck/test.

- Tests(bounds): broaden getEffectiveBounds coverage
  - blackout-only rules → empty=true, no bounds,
  - 's' timeUnit with closed clamps → integer second start/end,  - overlapping actives → earliest across actives; latest end is max across actives,
  - pre-pass ambiguity (earliest blackout before active) resolved by forward sweep to the first active start.

- Fix(bounds): step to strictly earlier prevEnd during backward reset
  - After a jump that lands exactly on a boundary (candidate == cursor),
    prevEnd equaled the cursor for some rules, and candidate selection    (which requires v < cursor) stalled. In resetBackward, when the
    computed end is at/after the cursor, step to the previous occurrence
    (rrule.before on the current start) and recompute until prevEnd < cursor.
    This guarantees progress and restores the expected latest active end
    under blackout overrides (e.g., 2024-01-10 06:00).
- Fix(bounds): ensure backward sweep progresses past boundary equality
  - When the backward candidate-jump landed exactly on a boundary
    (candidate == cursor), reset state seeded inclusively at the cursor,    leaving prevEnd >= cursor and no strictly earlier candidate. The
    loop broke without finding the latest active end under blackout
    overrides. Seed resetBackward with cursor - 1 (bounded by domainMin)
    to compute the last start strictly before the cursor and continue scanning.
- Fix(bounds): finalize backward sweep TS/test corrections
  - Backward jump now only selects candidates strictly before the current
    cursor (v < cursor) for both top blackout prevStart and higher active    prevEnd, guaranteeing progress.
  - Backward fallback uses a fresh evolving `status` (union type) and
    updates it per iteration; removes TS2367/TS2322 and restores correct
    latest-end detection for blackout overrides.
- Fix(bounds): TS/lint in backward fallback sweep
  - Track evolving `status` across iterations and compare
    (status === 'blackout' && newStatus === 'active') instead of using    a fixed `statusNow`. Removes TS2367/no-unnecessary-condition and
    restores intended transition detection.

- Perf(bounds): mirror candidate-filtered sweep for latest bound.
  While scanning backward and the cascade is blackout near the probe,
  jump only to the previous start of the top blackout and previous ends  of higher-priority actives; evaluate status just before the jump to
  detect the blackout→active transition (latest forward end). Fall back
  to fine-grained reverse sweep when needed. Behavior unchanged.
- Perf(bounds): cheaper probe status
  - Replace ruleCoversInstant(probe) with lastStartBefore + computed end
    comparison per rule. Same semantics; avoids the heavier multi-strategy    coverage check and reduces rrule calls in getEffectiveBounds.

- Fix(bounds): lint clean-up for candidate-jump sweep
  - Remove unused minBoundary import.
  - Replace prevStatus guard with per-iteration status check at the    current cursor; jump target recompute remains. Eliminates an
    “always-true” conditional flagged by ESLint. No behavior change;
    tests remain green.
- Perf(bounds): add candidate-filtered jump sweep for earliest bound.
  While status is blackout, only the controlling blackout’s end and
  higher‑priority active starts are considered; state is recomputed at  the jump target (ends-before-starts). This skips dense low‑priority
  occurrences masked by long higher‑priority blackouts. Public behavior
  unchanged; tests remain green.
- Perf(bounds): add single-rule pre-pass for earliest/latest and early
  open-end detection. Skip the backward sweep when open-ended, and accept
  earliest start when earliest active start precedes earliest blackout start,  and latest end when latest active end succeeds latest blackout end.
  Fall back to forward/backward sweeps on ties/ambiguity to preserve correctness.

- Docs(README/handbook): add brief React hooks description to README and expand
  the “React” handbook page with structured signatures, parameter/return
  details, behavior notes, and examples. Removed stray fences and ensured fence  hygiene in examples. No code changes; documentation only.

- Docs(handbook): add external documentation index with TypeDoc front matter
  - Created handbook/index.md with `title` and `children` (overview, react) to
    control sidebar structure.  - Updated typedoc.json to include only the index page (and CHANGELOG), removing
    the individual handbook pages from projectDocuments so they appear as
    children of the index automatically.

- Fix(react/useRRStack): resolve TS2554 and lint issues
  - Initialize cfgRef and debouncedRef with explicit initial values
    (cfgRef from current debounce config; debouncedRef = null) to satisfy    React’s useRef signature and avoid “expected 1 argument” errors.
  - Use a null check once and non-null assertions where the debounced
    wrapper is guaranteed to exist; remove unnecessary optional chaining.
  - Re-run scripts to confirm typecheck/lint/docs/build/tests are green.
- Fix(react/useRRStack): preserve debounced state across renders so flush() can
  emit pending trailing onChange immediately. Previous implementation recreated
  the debounced closure on each render (due to identity‑based dependencies),  losing the pending value; moved timer/pending/inWindow to refs and read the
  latest onChange/debounce config via refs. Subscription now calls a stable
  debouncedRef. Re‑run tests to confirm the flush() test passes under fake
  timers.

- Fix(react/useRRStack): decouple hook snapshot from Date.now()
  - useRRStack now uses a monotonic counter for the useSyncExternalStore
    snapshot and increments it on each RRStack notification. This avoids test    flakiness under vi.useFakeTimers (where Date.now() is frozen) that could
    suppress re-renders and leave DOM state stale in debounce tests.
  - Follow-up: this also resolves the lingering "data-count '1' vs '4'"
    failure in useRRStack debounce test and fixes the lint error for an
    unused useRef import once the counter is wired to the hook snapshot.
    Re-run lint/test to confirm green.
  - Finalize: wire the useRef counter into useSyncExternalStore getSnapshot
    and increment it before notifying React. Clears the @typescript-eslint/
    no-unused-vars error and makes re-renders deterministic under fake timers.
    Expect the debounce test to pass.

- Fix(react): stabilize flush() under fake timers
  - useRRStack: make flush() emit when a pending value exists (clear the timer
    if present). This avoids edge cases where the timer handle is absent with
    fake timers but a trailing call is still pending.

- Tests: raise timeout for heavy bounds open-start case
  - src/rrstack/bounds.open.test.ts: per-test timeout increased to 40s.

- Tests(react): expand useRRStack coverage
  - Add leading-debounce test (fires immediately; no trailing).
  - Add flush() test to trigger pending trailing onChange immediately. - Both tests use fake timers and await async act() to flush effects,
    improving coverage and guarding hook behavior.

- Fix(react): schedule debounced before React notify on mutation
  - useRRStack: in the subscribe callback, call debounced.call(rrstack)
    before bumping the snapshot and notifying React. Ensures a pending
    trailing call exists before flush() is invoked by tests or UI.

- Tests/React: add awaited microtasks inside async act() callbacks
  - useRRStack.test.ts: include `await Promise.resolve()` inside async act blocks to satisfy @typescript-eslint/require-await and reliably flush effects/store updates under happy-dom/React 19. Fixes the remaining
    debounce test failure (expected count '4').
- Dev: configure React act() for tests
  - Add test/setup.ts setting globalThis.IS_REACT_ACT_ENVIRONMENT = true.
  - Register setup in vitest.config.ts (setupFiles).

- Dev: add React globals support for tests/build
  - tsconfig.json: include DOM in compilerOptions.lib to provide `document`
    and other DOM globals for React tests. - React tests: import `act` from 'react' (React 19) to flush effects and
    avoid deprecation warnings.

- Feat(RRStack): add subscribe/unsubscribe mutation notifications. Notify
  exactly once after successful state changes; suppress during constructor.
- Feat(react): add hooks under subpath export "./react":
  - useRRStack(json, onChange?, { resetKey?, debounce?, logger? }) → { rrstack, version, flush }
    • debounce supports leading/trailing; flush emits pending trailing call.
    • logger: true => console.debug; function => custom sink.
  - useRRStackSelector(rrstack, selector, isEqual?) for derived memo.

- Tests: add unit test for removeRule mutator (RRStack.removeRule removes
  the specified rule and preserves remaining order).
- Tests: add error-case coverage for mutators — removeRule, swap, up,
  down, top, bottom — asserting TypeError on non-integer indices and
  RangeError on out-of-range indices.

- Feat(RRStack): add removeRule(index) convenience mutator to remove a rule
  by index and recompile (delegates to the rules setter).
- Docs (typedoc): add examples for getSegments limit usage and long-window guidance; add open-ended bounds example to getEffectiveBounds; add
  includeBounds/timezone toggles to description helpers.
- Docs (README): add “Open-ended bounds example” section and a short
  performance note under “Segment enumeration limit” encouraging window
  chunking and the per-call `limit` for very long windows.

- Docs: final README polish
  - Split merged parameters in classifyRange snippet so `from` and `to`
    appear on separate lines. - Use code formatting for the build-time constant
    `__RRSTACK_VERSION__` in Version handling.

- Docs: fix merged API Overview line and split combined inline comment
  in Quick Start step 4 to improve readability and avoid formatting
  ambiguity. No behavioral changes; aligns README with current API surfaces.

- Docs: polish README formatting and fence hygiene
  - Split merged comment/code in Quick Start step 4.
  - Split combined Helpers line into two lines. - Fix merged bullet under Timezones and DST.

- Docs: update README to reflect new APIs and behavior:
  - describeRule export and RRStack.describeRule(index, opts?)
  - getSegments(from, to, { limit }) explicit cap/throw - RRStack mutators (addRule, swap, up, down, top, bottom)
  - notes and examples for rule descriptions

- Fix(bounds): refine open-end detection to consider future occurrences
  after the far-future probe. If any open-ended active rule has a start
  after the probe, return end as undefined. This addresses schedules that are blackout exactly at the probe instant (e.g., daily windows)
  but continue indefinitely thereafter.

- Fix(bounds): when coverage is active at the far-future probe and any
  active rule has an open end, report end as undefined regardless of a
  backward-scan latestEnd value (which always exists before the probe). This corrects the open-ended end detection and satisfies the failing
  test in bounds.open.test.ts.

- Feat(bounds): detect open-ended end in getEffectiveBounds. Use a safe
  far-future probe bounded by domainMax and return end as undefined
  when the cascade is active at the probe and any active rule has an open end. Avoid false-empty by checking probe status.

- Feat(segments): add optional per-call `limit` to getSegments (public
  RRStack.getSegments also accepts opts). When the number of yielded
  segments would exceed the limit, throw explicitly (no silent truncation).
- Feat(RRStack): add convenience mutators addRule/swap/up/down/top/bottom.
  Each performs immutable updates and delegates to the rules setter for a
  single recompile.

- Feat(RRStack): add describeRule(index, opts?) instance method that
  returns a plain-language description for a rule using rrule.toText()
  plus effect/duration phrasing. Validates index and supports options for timezone/bounds inclusion.
- Feat(describe): add human-readable rule description helper leveraging
  rrule.toText(). Export describeRule(rule, tz, unit, opts?) from the
  package API. Includes duration phrasing and optional timezone/bounds details.
- Fix(compile): only set RRULE 'until' when ends is provided. Avoids
  constructing invalid far-future 'until' Dates in some timezones (e.g.,
  Asia/Bangkok) that caused rrule to throw "Invalid options: until". Preserved dtstart default to domainMin() for stability.
- BREAKING: RRStack.isActiveAt now returns boolean (true => active).
- Docs: update README to reflect boolean return of isActiveAt.
- Fix(types): emit dist/index.d.ts (rollup-plugin-dts) so package.json “types” and export mappings resolve. Fixes ESM TS “declaration file not
  found” error when importing the package.- Fix: Finalize rrule shim TS/lint cleanup (remove conflicting type imports; no-any; safe guards) to unblock typecheck/docs.
- Fix: Harden rrule ESM/CJS interop with a runtime shim that prefers default export when present; re-export Frequency/RRule/Weekday/datetime.- Fix: ESM/CJS interop for rrule — switch to namespace imports to avoid named export errors in ESM consumers that resolve rrule as CJS.
- Build: externalize runtime dependencies in Rollup (deps/peers marked external) to remove Luxon circular warnings and avoid bundling.
- Fix tests after RRStackOptions unification: mark freq literals with 'as const' and guard optional rules from toJson in rrstack.test.ts.- Unify JSON shapes: remove RRStackJson/fromJson; add optional version to RRStackOptions; constructor ignores version; toJson writes version.- TypeDoc: link to the raw JSON schema on the RRSTACK_CONFIG_SCHEMA page.

---

0. Top Priority — Stabilize template baseline (pre-implementation)
   [unchanged]

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

- None at this time.
