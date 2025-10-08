# RRStack — Development Plan

When updated: 2025-10-08 (UTC)

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

- Descriptions: suppress "from …" for open-start recurrences
  - Descriptor now sets clamps.starts for recurring rules only when the user
    provided a start clamp (isOpenStart === false). Open-start rules no longer
    render a "from" date in descriptions. Ends remain gated on isOpenEnd.


- Types: fix RRStackJson byweekday typing
  - Updated the zod options shape builder in RRStack.options.ts to be generic
    over the provided weekday schema (ZodTypeAny). This preserves the concrete    input type so RRStackJson.rules[].options.byweekday is number|number[]|undefined.
- DescribeConfig flattening (final cleanup):
  - Updated the remaining test (rrstack.describe.test.ts) to use the flattened
    keys (showBounds/boundsFormat) instead of the old nested bounds config.  - Resolves the last TS/build error and assertion for recurring bounds formatting.

- Descriptions & lint fixes:
  - Fixed recurring bounds (“from …”) formatting to honor the rule’s timezone by converting rrule “floating” dtstart/until via floatingDateToZonedEpoch when building descriptor clamps. This resolves America/Chicago (local midnight) and Europe/London (01:00 vs 00:00) test failures.
  - Adjusted yearly multi‑month cadence to use Oxford‑comma “or” lists for months and (when BYSETPOS/nth present) for weekdays, matching tests (e.g., “in january, february, or april … on the third tuesday, wednesday, or thursday”).
  - Removed unused import in cadence.ts and satisfied @typescript-eslint/restrict-template-expressions by stringifying numeric template operands in helpers.ts.
- API alignment:
  - Updated RRStack.describeRule to accept the unified DescribeConfig and removed the legacy DescribeOptions import to resolve typecheck errors.
- Descriptions (inline bounds and limits gating):
  - Added DescribeOptions.includeRecurrenceLimits (default false).
  - includeBounds now renders inline "from … until …" (no brackets) for both span and recurring rules, using boundsFormat when provided. - Translator (strict-en) gains limitsMode to control series limits:
    - includeBounds=false & includeRecurrenceLimits=true → append date‑only "from YYYY‑LL‑DD" (if starts) and "until YYYY‑LL‑DD" (if ends), plus "for N occurrence(s)" if count.
    - includeBounds=true & includeRecurrenceLimits=true → append only the count phrase (dates shown inline by includeBounds).
    - default: suppress all translator-level limits to avoid duplication/clutter.
  - Updated tests that previously asserted default COUNT/UNTIL to opt-in via includeRecurrenceLimits.
  - Preserved style: no colon after duration (e.g., "Active for 1 hour every …").

- Style (descriptions):
  - Removed the colon after the duration in rule descriptions (e.g., "Active for 1 hour every day at 5:00"). Updated tests and docs examples accordingly.
  - Implemented in code (describeCompiledRule) to match tests; recurrence descriptions now read "Active for 1 day every day ..." without a colon.

- Docs:
  - Cross‑link pass: added explicit links from API → Descriptions and React → API/Configuration/Getting started to improve navigation without losing detail.

- rrule floating-date seam (host-agnostic):
  - Construct rrule Dates with rrule.datetime(y,m,d,hh,mi,ss) (UTC fields carrying wall parts in the rule tz). Decode via UTC getters and rebuild Luxon DateTime in the rule tz for epoch math. Eliminates host offset drift.- Bounds timezone remediation: - Implemented rrule README cautions: rrule-facing Dates are now built with host-local constructors from wall parts in the rule timezone (floating).
  - Decoding uses LOCAL getters on rrule Dates and Luxon to obtain epoch in the rule timezone (ms/s unit-aware).
  - Removed all raw .getTime() usage on rrule Date outputs; all comparisons go through floatingDateToZonedEpoch + computeOccurrenceEnd.

- Tests (cross timezones):
  - Hardened new cross‑timezone bounds/describe tests to assert local wall‑clock values in the rule’s timezone (using Luxon) instead of raw epoch equality, ensuring determinism on UTC+8 hosts.
- Tests (cross timezones):
  - Added realistic non‑UTC tests validating getEffectiveBounds and rule descriptions across Europe/London, Asia/Tokyo, Australia/Sydney, and Asia/Kolkata.
- Tests (span description, Asia/Singapore):
  - Added a test to confirm span description with includeBounds in Asia/Singapore:
    - Default ISO with +08:00 offset,
    - Date-only boundsFormat ('yyyy-LL-dd'), and optional timezone label.
- Tests (describeRule utility, Asia/Singapore span):
  - Added a companion test that calls the describeRule helper directly with the same data and assertions (ISO +08:00, date-only format, timezone label).
- Bounds & descriptions (America/Chicago daily 1‑day rule):
  - Fixed recurring bounds rendering when `includeBounds=true` by treating RRULE floating dates correctly (UTC fields reflect local wall time) and rebuilding them in the rule’s timezone before formatting. Removes wrong outputs like “from 2025‑09‑30 19:00”.
  - Improved earliest‑bound pre‑pass: when the earliest blackout candidate is the domain minimum (baseline blackout), accept the earliest active start directly. This corrects the earliest start for the Chicago daily 1‑day case. - Earliest pre‑pass refinement: use compiled `dtstart` as the base for `rrule.after(base, true)` (do not treat `dtstart` itself as the earliest start), falling back to the rule wall‑min when `dtstart` is absent. This removes environment‑dependent drift and preserves correct first occurrence selection (e.g., BYHOUR 05:00 with a midnight `dtstart`). - Guard for “no BY time” recurrences: when no BYHOUR/BYMINUTE/BYSECOND are specified and a `dtstart` exists, treat `dtstart` as the earliest start directly (convert via `floatingDateToZonedEpoch`) instead of relying on `rrule.after(base, true)`. This eliminates the remaining +13 h drift on hosts far ahead of America/Chicago.

- Description tests:
  - Added America/Chicago assertion that the daily 1‑day rule with a `starts` clamp renders bounds as local midnight (`from 2025-10-01 00:00`) and not the incorrect `from 2025-09-30 07:00`.

- Time helpers consistency:
  - Renamed helper parameter `zone` → `timezone` to align with RRStackOptions.
  - Made `timeUnit` optional with `DEFAULT_TIME_UNIT` default in `wallTimeToEpoch` and `dateOnlyToEpoch` (already defaulted in `epochToWallDate`).
  - Updated JSDoc `@param` tags (`unit` → `timeUnit`; `zone` → `timezone`) to clear TypeDoc warnings.

- Tests:
  - Added America/Chicago assertion for `RRStack.formatInstant` (CST, -06:00) to verify zone handling and local formatting.

- Bounds tests:
  - Added America/Chicago assertion that `getEffectiveBounds().start` equals the configured `starts` (1759294800000) for a daily 1‑day rule (open end).

- Defaults and TS narrowing:
  - Centralized defaults are now applied consistently during normalization (DEFAULT_TIME_UNIT, DEFAULT_DEFAULT_EFFECT).
  - DEFAULT_DEFAULT_EFFECT is exported as the literal `'auto'`, enabling proper TypeScript narrowing in RRStack.baselineEffect and resolving TS2322 errors.

- JSON Schema: OpenAPI‑safe duration shape
  - Removed the duration.anyOf positivity injection from the generated schema to improve compatibility with serverless-openapi-documenter and other OpenAPI tools.
  - Duration remains optional in the published JSON Schema; advanced constraints (e.g., “duration required when freq is present” and “strictly positive duration”) continue to be enforced by Zod at runtime.
  - Updated tests (schema.test.ts) to drop the anyOf assertion and verify presence of duration properties and freq enum.
  - Updated README and requirements to document OpenAPI-safe policy.

- Docs: descriptions/bounds formatting
  - README “Rule description helpers”: corrected default (includeTimeZone is opt‑in) and added boundsFormat example.
  - Handbook “Descriptions”: added a short boundsFormat section with examples.

- DescribeOptions bounds formatting:
  - Added `boundsFormat?: string` to DescribeOptions for customizing how includeBounds dates are rendered. When provided, bounds use Luxon `toFormat(boundsFormat)` in the rule’s timezone; otherwise ISO formatting is preserved. Added tests for both span and recurring rules.

- Schema/type sync:
  - ruleLiteSchema.options is now optional with `.default({})`, allowing span rules without an options block in JSON.
  - Added and exported `rrstackJsonSchema` (Zod) and `RRStackJson` (TypeScript input type) that correspond exactly to the published JSON Schema.
  - normalizeOptions now parses with the unified `rrstackJsonSchema` so `rules` default to `[]` and each rule’s `options` default to `{}`.
  - Regenerated assets/rrstackconfig.schema.json to remove `options` from rule `required` and add `default: {}` for `options`.
  - Re-exported `RRStackJson` from the package root.

- Time conversion utilities (final test fix):
  - Luxon may normalize invalid wall times (e.g., 02:30 → 03:30) while reporting `isValid=true`. We now detect normalization (mismatched wall fields) and treat it as invalid for our policy, then probe successive wall minutes via `DateTime.fromObject` to pick the earliest valid minute (02:30 → 03:00).
  - All tests green.
  - Tightened the minute-probing loop to accept a candidate only when the constructed wall fields match the requested minute exactly (in addition to `isValid`). This prevents accepting normalized times like 03:30 at 02:30 and ensures we land at 03:00.

- Time conversion utilities (tests green):
  - Resolved the remaining spring-forward test by probing successive wall minutes with DateTime.fromObject (wall construction) to find the earliest valid minute at/after the requested time (02:30 → 03:00). Avoids timeline-based additions that could land at 03:30 across the gap.
- Docs (API): Added TSDoc/TypeDoc comments for time helpers (`wallTimeToEpoch`, `dateOnlyToEpoch`, `epochToWallDate`) including parameters, errors, DST semantics, and examples. They are exported from the root and will render in the API reference.

- JSON input strictness & policy:
  - Enumerated RRULE-compatible keys in `rule.options` and made the schema strict (no additional properties). Options remain optional with default {}.
  - Updated project policy: assistants must never patch generated files (e.g., assets/rrstackconfig.schema.json). Change the generator and rerun scripts to refresh artifacts.

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

- JSON input strictness (follow-up):
  - Kept rule.options strict and enumerated while allowing `byweekday` to accept either numeric 0..6, rrule Weekday instances, or mixed arrays. This preserves type-safety for keys and unblocks existing tests/usage. Also resolved TSDoc warnings by avoiding ambiguous `{}` in comments.
  - Split schemas: rrstackJsonSchema (JSON-safe; numeric byweekday only) and rrstackRuntimeSchema (accepts Weekday). normalizeOptions now uses the runtime schema; the JSON Schema generator continues to use the JSON schema (no custom types).
