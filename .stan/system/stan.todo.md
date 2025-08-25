# RRStack — Requirements and Development Plan

Last updated: 2025-08-24 (UTC)

This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

---

Completed (recent)

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

- Update tests for:
  - Flattened JSON shape, version string in toJson.
  - Timezone setter validation; branded TimeZoneId behavior.
  - Seconds semantics (ceil end) and now().
  - Streaming getSegments over long windows (no memory blow-up).
  - Independent getEffectiveBounds (no reliance on getSegments).
  - Elimination of EPOCH\_\* constants.

---

8. Long-file scan (source files > ~300 LOC)

- src/rrstack/RRStack.ts ≈ 340+ LOC (flagged): propose a follow-up split:
  - rrstack/RRStack.options.ts — constructor, zod schemas, setters, updateOptions.
  - rrstack/RRStack.persistence.ts — toJson/fromJson + version constant plumbing.
  - rrstack/RRStack.queries.ts — isActiveAt/getSegments/classifyRange/getEffectiveBounds façades.
  - Keep RRStack.ts as a thin barrel that re-exports and composes these concerns.
- Completed: split of src/rrstack/sweep.ts into src/rrstack/segments.ts and src/rrstack/bounds.ts; introduced src/rrstack/util/heap.ts; sweep.ts is a façade. Keep modules focused and short.

---

9. Next steps (implementation plan)

- Lint/DX:
  - Re-run eslint after duration.ts fix; address any remaining items repo-wide.
- Tests/coverage:
  - Add targeted tests to raise coverage in bounds.ts (earliest/latest open-sided detection) and util/heap.ts.
  - Add a small test matrix for 's' timeUnit to verify end rounding behavior across DST transitions.
- Refactor (pending approval):
  - Proceed with the RRStack.ts split described above to reduce file length and improve cohesion.
