# RRStack — Requirements and Development Plan

Last updated: 2025-08-24 (UTC)

This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

---

Completed (recent)

- Promote durable requirements to stan.project.md (options/timeUnit/timezone brand; JSON flattening with version; streaming getSegments; independent heap-based getEffectiveBounds; eliminate EPOCH_*; property setters; minimal zod; browser support; changelog config; version injection). Update this plan accordingly.

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
  - Eliminate EPOCH_*_MS; domainMin/unit = 0; domainMax/unit from JS Date limits.
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
  - Elimination of EPOCH_* constants.

---

8. Long-file scan (source files > ~300 LOC)

- Split coverage.ts per plan; keep modules focused and short.

---

9. Next steps (implementation plan)

- Types
  - Add TimeZoneId branded type; RRStackOptions/RRStackOptionsNormalized/RRStackJson interfaces (extend where useful).
  - Remove EPOCH_* constants; add internal domainMin/unit & domainMax/unit helpers.
- Validation
  - Add zod schemas (options/json); rule-lite checker for rule mutations.
- RRStack class
  - options storage (frozen); property setters; updateOptions; now().
  - toJson uses build-injected __RRSTACK_VERSION__; fromJson validates.
- Algorithms
  - Unit-aware compile.
  - coverage split into time/patterns/enumerate/coverage.
  - sweep: streaming heap-based boundary merge.
  - getEffectiveBounds: heap-based earliest/latest; open-side detection.
- DX/Docs
  - Update README to document new shapes/semantics and browser notes.
  - Add helpers RRStack.isValidTimeZone / RRStack.asTimeZoneId.
- Build/Changelog
  - Add package.json auto-changelog config (commitLimit=false).
  - Add Rollup replace plugin to inject __RRSTACK_VERSION__.
