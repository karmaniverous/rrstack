# RRStack — Development Plan

When updated: 2025-10-01 (UTC)

Next up (near‑term, prioritized)

1. Engine update() + policies
   - Implement RRStack.update(partial?: Partial<RRStackOptions>, policy?: UpdatePolicy): readonly Notice[].
   - Remove updateOptions (source, tests, docs).
   - Wire version detector + upgradeConfig(from, to, json) at the front of update():
     - No‑op upgrader today; documented for future model changes.
     - Apply policy defaults: • onVersionUp: 'off' (accept; upgrader runs), • onVersionDown: 'error' (reject unless 'warn'/'off', then ingest as current), • onVersionInvalid: 'error' (reject unless 'warn'/'off', then ingest as current).
   - Emit notices and support onNotice callback.

2. Time unit changes (conversion)
   - Allow timeUnit changes in update():
     - If rules provided in the same call: replace rules; treat incoming timestamps as already in the new unit (no conversion).
     - If rules not provided: convert retained rules’ options.starts/options.ends: • ms → s: Math.trunc(ms / 1000), • s → ms: s \* 1000.
   - Recompile once after apply; keep 's' end rounding in computeOccurrenceEnd.

3. React ingestion via update()
   - In useRRStack, replace internal ingestion path to call rrstack.update(json, policy).
   - Keep comparator that ignores version to avoid ping-pong; preserve staged vs compiled semantics.
   - Ensure onChange still receives rrstack.toJson() (staged overlay intact).

4. Tests
   - Engine: unit-change with/without rules; version up/down/invalid per policy; notices returned and callback invocation order; single recompile.
   - React: json ingestion via update (no ping-pong); debounce/flush paths remain stable.

5. Docs
   - Requirements (this file): reflect update(), policies, notices, upgrader, timeUnit mutability and conversion.
   - README/Handbook: • Update API and policy defaults, • Unit-change example, • React form→engine ingestion loop using update(), • Notice handling guidance.

6. Cleanup / exports
   - Remove updateOptions from public surface; search/replace references.
   - Typedoc: ensure new types (Notice, UpdatePolicy) are exported and documented.

Completed (recent)

- Requirements & plan updated:
  - Introduced single ingestion method update(partial, policy); removed updateOptions.
  - Added version detection pipeline with no‑op upgrader; specified UpdatePolicy defaults.
  - Defined Notice union and conversion semantics for timeUnit changes (retained vs incoming rules).
  - Confirmed React form→engine flow using update() with comparator guard and staged overlay via toJson().
