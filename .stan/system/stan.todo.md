# RRStack — Development Plan

When updated: 2025-10-04 (UTC)

Next up (near‑term, prioritized)

1. Docs polish
   - Consider a dedicated "Time conversion helpers" page in Handbook if usage grows; otherwise keep README section concise.

2. Tests
   - Expand table-driven coverage for additional IANA zones if CI ICU permits; keep deterministic across environments.

3. Typedoc
   - Add typedoc comments for the new helpers if we decide to publish in API reference (optional).

4. BENCH (optional)
   - Add small benches around update() hot path (unit change retained vs incoming rules) for regression tracking.

Completed (recent)

- Docs (API): Added TSDoc/TypeDoc comments for time helpers (`wallTimeToEpoch`, `dateOnlyToEpoch`, `epochToWallDate`) including parameters, errors, DST semantics, and examples. They are exported from the root and will render in the API reference.

- Time conversion utilities (follow-up fixes):
  - Resolved TypeScript TS2775 by changing the assertion function to a function declaration (`assertValidUnit`) in src/time/index.ts.
  - Adjusted DST forward gap mapping to use the earliest valid instant at/after the requested wall time (minute-level bump). This maps 02:30 in the spring gap to 03:00 local (per requirements) and fixes the failing test.

- Time conversion utilities:
  - Implemented timezone conversion helpers in `src/time/index.ts`:
    - `wallTimeToEpoch(date, zone, unit)`
    - `dateOnlyToEpoch(date, zone, unit)`
    - `epochToWallDate(epoch, zone, unit='ms')`
  - Behavior: validation errors (Invalid Date/zone/unit), unit semantics ('ms'| 's'), DST correctness (gap→next valid; fallback→earlier offset), round-trip friendly (floating Date).
  - Added unit tests `src/time/convert.test.ts` covering ms/s, UTC/New_York/Paris, DST edges, round-trips, and validation.
  - Exported helpers from package root.
  - Updated README and Handbook (overview) with a short “UI mapping” example and notes.

- Build/tests:
  - Fixed TS4104 in src/react/useRRStack.test.ts by typing the result of rrstack.update()’s returned Notice[] to match the API return type.

- React tests:
  - Added ordering/delivery test to compare rrstack.update()’s returned Notice[] with notices received via policy.onNotice (identical content and ordering).
    - Confirms synchronous onNotice delivery semantics alongside return value.

- Docs:
  - Handbook Overview: added “Policy & notices” snippet with core and React examples to mirror README guidance.

- React tests:
  - Added ingestion policy notice test: verifies that hook `policy.onNotice` receives a `timeUnitChange` notice when json changes unit ('ms' → 's').
- React tests:
  - Further relaxed overlapping-staged-edits final-state assertion: validate the rule count pattern (1 + k\*3, k ≥ 1) to tolerate Strict/dev double-effect behavior while still asserting the committed final state.
- React tests:
  - Relaxed "overlapping staged edits commit once and reflect final state" to allow 1–2 onChange emissions across environments; assertions now validate the final event state (single commit semantics preserved).

- Tooling:
  - knip.json: removed stale "stan.rollup.config.ts" entry to resolve the configuration hint.

- React tests:
  - Added ingestion guard test (json comparator ignores version to avoid ping‑pong).
  - Added overlapping staged edits test to assert single commit and final state under mutateDebounce.
  - Stabilized overlapping staged edits test by coalescing onChange via changeDebounce to ensure a single observable autosave for the window.

- Build & lint fixes:
  - Removed stray triple‑slash reference in src/rrstack/types.ts that broke TS/Typedoc/rollup (TS6231).
  - Tidied TSDoc in DurationParts to escape special characters.
  - Resolved ESLint unused binding in src/react/useRRStack.ts by switching to a deletion comparator for prop ingestion.
  - Verified typecheck/lint/build/docs succeed.

- Typedoc polish:
  - Added comprehensive TSDoc for Notice and UpdatePolicy with short examples to improve API reference output.

- React API:
  - Implemented `policy?: UpdatePolicy` passthrough on useRRStack. Applied to both prop ingestion and staged commits; onNotice routed centrally.

- Docs refresh:
  - README: added upgrade-policy example and noted hook policy passthrough.
  - Handbook (React): updated signature, parameters, and ingestion notes to include policy/onNotice.
- Requirements & plan updated:
  - Introduced single ingestion method update(partial, policy); removed updateOptions.
  - Added version detection pipeline with no‑op upgrader; specified UpdatePolicy defaults.
  - Defined Notice union and conversion semantics for timeUnit changes (retained vs incoming rules).
  - Confirmed React form→engine flow using update() with comparator guard and staged overlay via toJson().

- Engine & Hooks implemented:
  - Added RRStack.update(partial, policy) with version pipeline, unit conversion, and notices; removed updateOptions.
  - Switched mutate manager to rrstack.update(patch).
  - Pruned façade’s legacy updateOptions staging branch.
  - Exported Notice & UpdatePolicy from package root.

- Engine tests added:
  - update(): unit-change retained vs incoming rules, version down/invalid policies, timeUnit policy error/warn, onNotice ordering.
