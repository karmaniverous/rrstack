# RRStack — Development Plan

When updated: 2025-10-01 (UTC)

Next up (near‑term, prioritized)

1. React tests
   - json ingestion via update (no ping-pong); debounce/flush paths remain stable for additional edge cases (e.g., overlapping staged edits).

2. Docs
   - README/Handbook: • Update API and policy defaults, • Unit-change example, • React form→engine ingestion loop using update(), • Notice handling guidance.

3. Cleanup / exports
   - Remove residual references to updateOptions in docs/tests (if any).
   - Typedoc: ensure new types (Notice, UpdatePolicy) are exported and documented.

4. BENCH (optional)
   - Add small benches around update() hot path (unit change retained vs incoming rules) for regression tracking.

Completed (recent)

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