# RRStack — Requirements and Development Plan

Last updated: 2025-09-23 (UTC)

## This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

Completed (recent)

- Feat(schema): make all defaulted top-level properties optional (timeUnit, defaultEffect, rules) and regenerate JSON Schema (only 'timezone' required).
- Tests: add segment and classifyRange cases under defaultEffect baseline to exercise streaming and classification with a baseline.
- Docs: README “JSON Shapes and Types” now includes defaultEffect with a brief baseline semantics note.
- Chore(lint): escape '>' in TSDoc for baselineEffect to clear tsdoc/syntax warnings.
- Fix(core): include defaultEffect when freezing updated options in RRStack setters (timezone, rules, updateOptions) and refine baselineEffect to satisfy lint (no-unnecessary-condition).
- Feat(core): add RRStackOptions.defaultEffect ('active' | 'blackout' | 'auto', default 'auto') and implement a virtual baseline span rule prepended at query time. All query surfaces (isActiveAt, getSegments, classifyRange, getEffectiveBounds) now respect the baseline without algorithm changes. JSON schema, normalization, persistence, and tests updated.
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
