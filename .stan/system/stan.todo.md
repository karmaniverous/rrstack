# RRStack — Requirements and Development Plan

Last updated: 2025-08-25 (UTC)

This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

---

Completed (recent)

- Added deeper bounds tests:
  - bounds.closed.test.ts covers closed-sided earliest/latest bounds and mixed cascade (blackout override).
  - Complements bounds.open.test.ts (open start and empty set).
- DX/Docs verified: internal refactor only; README requires no changes (public API unchanged).
- Split RRStack.ts into helper modules to reduce size and improve cohesion:
  - RRStack.options.ts (schemas/normalization), RRStack.persistence.ts (toJson/fromJson helpers), RRStack.queries.ts (query façade). RRStack.ts remains the public class and delegates to these modules.
- Add tests to raise coverage:
  - bounds.open.test.ts for open-start and empty detection,
  - heap.test.ts for min/max boundary helpers,
  - seconds.unit.test.ts for 's' timeUnit DST and integer-second ends.
- Fix ESLint/TSDoc in duration helpers: remove numeric template literal interpolation per @typescript-eslint/restrict-template-expressions, type named RegExp groups as possibly undefined to satisfy @typescript-eslint/no-unnecessary-condition, and escape braces in TSDoc. No functional changes; prepares repo for clean lints.
- Documentation pass: update README to reflect current API (flattened JSON with version string, property-style setters and updateOptions, no EPOCH constants, seconds rounding). Add/expand TypeDoc on RRStack class and key helpers (segments/bounds/coverage/compile/types). Verified fence hygiene in README.
- Inject build-time version: add @rollup/plugin-replace to inject **RRSTACK_VERSION** from package.json in rollup.config.ts; toJson now emits the package version without runtime imports.
- Tighten coverage reporting: include only src/_\_/_.ts and exclude dist/.stan/docs/.rollup.cache to avoid duplicate/irrelevant files in “All files”.
- Promote durable requirements to stan.project.md (options/timeUnit/timezone brand; JSON flattening with version; streaming getSegments; independent heap-based getEffectiveBounds; eliminate EPOCH\_\*; property setters; minimal zod; browser support; changelog config; version injection). Update this plan accordingly.
- Fix ESLint errors: remove any cast in rrstack.test.ts (type via unknown→RRStackJson), and replace while(true) with for(;;) in sweep.ts to satisfy @typescript-eslint/no-unnecessary-condition.
- Split sweep.ts (~332 LOC) into segments.ts (getSegments/classifyRange) and bounds.ts (getEffectiveBounds); introduced util/heap.ts for boundary helpers; sweep.ts now a thin façade.

---

0. Top Priority — Stabilize template baseline (pre-implementation)
   [unchanged]

---

1. Requirements (confirmed)

- Options
  - RRStackOptions (input): { timezone, timeUnit? = 'ms', rules? = [] }
  - RRStackOptionsNormalized (stored): extends Omit<…> with timeUnit required, rules required, timezone: TimeZoneId (branded).
  - Flattened RRStackJson extends normalized options and adds { version: string }.
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
  - toJson writes build-injected version; fromJson validates; transforms added later if needed.
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
  - RRStackOptions (constructor/fromJson).
  - Rule-lite checks on mutations (effect literal, options.freq numeric, starts/ends finite).
- Full RRULE validation remains in compile.

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

- None currently pending.
