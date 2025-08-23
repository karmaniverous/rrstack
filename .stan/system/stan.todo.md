# RRStack — Requirements and Development Plan

Last updated: 2025-08-23 (UTC)

This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

---

0. Top Priority — Stabilize template baseline (pre-implementation)
   [unchanged]

---

1. Requirements (confirmed)
   [unchanged]

---

2. External dependencies (Open-Source First)
   [unchanged]

---

3. Public contracts (service-first; ports)
   [unchanged]

---

4. Core algorithms

- Compilation (object → RRule): unchanged.
- Coverage detection (instant):
  - Day-window enumeration in ruleCoversInstant: enumerate all starts on the local calendar day of t (in rule.tz) and test coverage.
  - DAILY fallback: when starts (dtstart) doesn’t align with an occurrence boundary (e.g., daily 09:00 with starts at 00:00), check the day’s BYHOUR/BYMINUTE/BYSECOND combinations locally (in the rule’s timezone) and honor dtstart so the first occurrence is on/after starts.
  - Structural tz‑local fallback for MONTHLY/YEARLY nth‑weekday and bymonthday patterns when same‑day rrule enumeration returns none; always applied if coverage not yet found (preserves rrule.before and horizon fallbacks).
  - Treat Weekday.n=0 as “no ordinal”; prefer bysetpos when present so MONTHLY bysetpos+byweekday (e.g., “3rd Tuesday”) matches correctly.

---

5. Module split (services-first; keep files short)
   [unchanged]

---

6. Validation & constraints
   [unchanged]

---

7. Tests (status)

- Odd-months scenario: PASS.
- Every‑2‑months scenario:
  - Revalidated assertions and aligned dtstart to the first actual occurrence (2021‑01‑19 05:00 America/Chicago) so interval stepping is well-defined.
  - Expected outcomes (May 18 active; July 16 blackout; July 20 active) remain unchanged.
- Daily at 09:00 starting at midnight (America/Chicago): PASS with DAILY fallback
  - Confirms requirement (1): starts at midnight still yields first occurrence at 09:00 on the start date, none before.

---

8. Long-file scan (source files > ~300 LOC)
   [unchanged]

---

9. Next steps (implementation plan)

- Monitor across environments; if residual drift appears, consider narrow normalization (e.g., widen same-day window slightly) with rationale, avoiding heavy dependencies.
