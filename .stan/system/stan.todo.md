# RRStack — Requirements and Development Plan

Last updated: 2025-08-26 (UTC)

This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.
---

Completed (recent)

- Fix schema generator: handle RRStackJson under definitions/$defs when locating `rules.items`; scan both definitions and $defs to find DurationParts and add positivity anyOf.
- Fix schema test: handle RRStackJson root under definitions/$defs when locating `rules`; resolve $ref for Rule (rules.items) and DurationParts; assert positivity anyOf on the resolved node.
- Follow-ups for JSON Schema export:
  - Fix typecheck: replace invalid `as const` on imported JSON with a
    JSONSchema7 assertion via `unknown` in RRStack.schema.ts.
  - Decouple Zod option refine from coverage/time.ts to avoid pulling
    rrule into the schema generator; use Luxon IANAZone directly.
  - Replace rrule Frequency import with a numeric literal-union Zod
    schema for `options.freq` (emits enum [0..6]) so the generator can
    run without bundling `rrule`.
  - Make scripts/gen-schema.ts fully typed (no any/unsafe) and follow
    $ref safely; mutate DurationParts anyOf in place.
  - Make schema.test.ts fully typed (no any/unsafe).
- Export JSON Schema as a package-level constant:
  - Added zod-to-json-schema generator (scripts/gen-schema.ts).
  - New artifact assets/rrstackjson.schema.json generated at docs/build time.
  - New export RRSTACK_JSON_SCHEMA (src/rrstack/RRStack.schema.ts) and re-exported from src/index.ts.
  - Tightened options.freq to an enum; post-processed DurationParts with
    anyOf requiring at least one non-zero component.
  - Added schema test (src/rrstack/schema.test.ts).
  - Updated docs script to run the generator before typedoc.
- Added minimal documentation hook (schema present; link can be added to README later).
- No changes to runtime parsing behavior (existing JsonSchema remains as-is).
- Add README “JSON Schema” section linking to assets/rrstackjson.schema.json and the exported RRSTACK_JSON_SCHEMA constant.
- Replace numeric RRULE Frequency enum in RuleOptionsJson.freq with a lower-case string union; map to rrule’s numeric enum internally during compilation; update README and tests accordingly.

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
  - Rule-lite checks on mutations (effect literal, options.freq numeric, starts/ends finite if present); full RRULE Options validation remains in compile.

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