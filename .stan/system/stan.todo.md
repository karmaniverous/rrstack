# RRStack — Requirements and Development Plan

Last updated: 2025-08-22 (UTC)

This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

--------------------------------------------------------------------------------

0) Top Priority — Stabilize template baseline (pre-implementation)

Goals:
- Ensure the template is green and reproducible before adding new code.
- Resolve current warnings and cleanup items introduced during STAN integration.

Tasks:
- Scripts green across the board
  - Verify: npm run typecheck, npm run lint, npm run test, npm run build, npm run docs
  - Fix any warnings that mask real problems (see below).
  - Status: Verified from attached outputs (typecheck/lint/test/build/docs/knip all clean). [DONE]
- Docs warning
  - Current: typedoc warns “CHANGELOG.md did not match any files.”
  - Decision: Added minimal CHANGELOG.md at repo root and kept projectDocuments in typedoc.json. [DONE]
- Knip cleanup
  - Current: Unused devDependencies: @types/eslint__js, @types/eslint-config-prettier, @types/fs-extra, fs-extra.
  - Decision: Removed unused devDependencies and deleted unused file src/util/packageName.ts. [DONE]
- CI/workflows sanity
  - Confirm GitHub workflow(s) are still valid post-integration (.github/workflows/sync.yml uses a reusable workflow; ensure secrets configured).
  - Status: Manual validation pending in GitHub; repo-side config unchanged. [PENDING]
- Rollup/TypeScript baseline
  - Confirm rollup builds without warnings (beyond the known incremental plugin note).
  - Ensure src/cli dynamic enumeration (readdir('src/cli')) is valid; if CLI is optional, guard against missing folder (not urgent since folder exists).
  - Decision: Excluded ".stan" from tsconfig to prevent typechecking generated artifacts. [DONE]
  - Status: Build successful; only known @rollup/plugin-typescript incremental warning present. [DONE]
- ESLint/Prettier
  - Run npm run lint and ensure formatting/linting remains deterministic; no unintended changes.
  - Decision: Ignored ".stan/**/*" in ESLint flat config to avoid linting generated artifacts. [DONE]
- Vitest config compatibility
  - Current: Vitest v3 can expose configDefaults.watchExclude as a RegExp; spreading it causes a TypeError.
  - Decision: Normalize configDefaults.exclude/watchExclude to arrays before extending with '**/.rollup.cache/**'. [DONE]
  - Also: Increased global testTimeout to 20000ms to avoid timeouts with rrule enumeration. [DONE]
- .stan guardrails
  - Verify stan.config.yml excludes and outputs are correct.
  - Ensure .stan paths remain committed per STAN policy (system docs and future todo/refactor entries).
  - Status: Verified. [DONE]
- Freeze baseline
  - After the above, commit a “stabilize template” change so future diffs isolate RRStack work.
  - Status: Captured here; subsequent work proceeds under RRStack. [DONE]

--------------------------------------------------------------------------------

1) Requirements (confirmed)

- Purpose: Manage a stack (ordered set) of recurrence rules (rrule) to determine when an “offer” is active vs blacked out.
- Time zone:
  - Exactly one IANA timezone per RRStack instance.
  - All rule times are interpreted in this timezone; DST-correct behavior is required.
- Time domain:
  - All instants are milliseconds since Unix epoch (ms).
  - Fixed domain edges:
    • domainStartMs = 0 (1970-01-01T00:00:00Z)
    • domainEndMs = 2,147,483,647,000 (2038-01-19T03:14:07Z)
  - The stack never applies outside [domainStartMs, domainEndMs). Treat end as exclusive.
- Rule model (object-form; no RRULE text persisted):
  - Each rule is stored and accepted as a JSON object of RRULE properties (per rrule Options types), plus:
    • starts?: number (ms) — optional; undefined means unbounded (clamped to domainStartMs internally)
    • ends?: number (ms) — optional; undefined means unbounded (clamped to domainEndMs internally)
    • duration: ISO-8601 duration string (e.g., 'PT1H', 'P1M')
    • effect: instantStatus ('active' | 'blackout')
    • label?: string (optional)
  - We derive types directly from rrule (Frequency, Options['byweekday'], WeekdayStr, etc.). Do not redefine token unions.
- Cascade semantics (ordered rules):
  - Baseline state at any instant is 'blackout'.
  - For each rule in order:
    • If the instant is covered by that rule’s occurrence window, state becomes the rule’s effect ('active' or 'blackout').
    • If not covered, it does nothing; previously set state remains.
- “Open-ended” rule bounds:
  - If starts is undefined, internally compile dtstart = domainStartMs.
  - If ends is undefined, internally compile until = domainEndMs.
  - Rules never generate occurrences outside the fixed domain.
- Persistence:
  - Instances are persisted as JSON with rule options in object form (as above).
  - Provide toJson(): RRStackJson and static fromJson(json): RRStack.
- API and statuses:
  - instantStatus = 'active' | 'blackout'
  - rangeStatus = instantStatus | 'partial'
  - Methods:
    • isActiveAt(ms): instantStatus
    • getSegments(fromMs?: number, toMs?: number): Iterable<{ start: number; end: number; status: instantStatus }>
      - Returns contiguous non-empty segments that partition [from, to) (clamped to domain); status is the cascaded state.
    • classifyRange(fromMs, toMs): rangeStatus
      - 'active' if every segment is active, 'blackout' if every segment is blackout, 'partial' otherwise.
    • getEffectiveBounds(): { start?: number; end?: number; empty: boolean }
      - Exact within domain:
        ◦ empty = true if no active instant exists.
        ◦ start is undefined iff the earliest active instant equals domainStartMs and comes from at least one covering activate rule that is open-start (starts undefined), not vetoed at that instant.
        ◦ end is undefined iff the last active instant equals domainEndMs and comes from at least one covering activate rule that is open-end (ends undefined), not vetoed at that instant.
    • Rule ordering:
      - addRule(rule, position?)
      - swapRules(i, j)
      - ruleUp(i, steps=1) and ruleDown(i, steps=1): no-ops at edges; never throw
      - ruleToTop(i), ruleToBottom(i)
- Example scenario must be supported:
  - Activate: “3rd Tuesday of every other month 5–6am America/Chicago”
  - Blackout: “except during July”
  - Activate: “unless that day is the 20th”
  - Ordering: [activate pattern, blackout July, re-activate on 20th] to allow final re-activation.

--------------------------------------------------------------------------------

2) External dependencies (Open-Source First)

- rrule (v2+): recurrence engine; supports TZID when Luxon is present.
- luxon: timezone-aware math and parsing of ISO durations; DST-correct add.
- Optional: zod for runtime validation (JSON schema and inputs).
- No CLI deps required for the library surface.

Trade-offs:
- rrule + tzid + luxon is a widely used, robust combo; DST handling is reliable when ends are computed with Luxon in the desired zone.
- We avoid rrulestr for persistence to keep JSON structure ergonomic and validated via types.

--------------------------------------------------------------------------------

3) Public contracts (service-first; ports)

Types (extracted from rrule where available):
```ts
import type { Options as RRuleOptions, Frequency } from 'rrule';

export type instantStatus = 'active' | 'blackout';
export type rangeStatus = instantStatus | 'partial';

export interface RuleOptionsJson {
  // rrule-native option types; tokens from rrule (no redefinitions)
  freq: Frequency;
  interval?: RRuleOptions['interval'];
  wkst?: RRuleOptions['wkst'];
  count?: RRuleOptions['count'];

  bysetpos?: RRuleOptions['bysetpos'];
  bymonth?: RRuleOptions['bymonth'];
  bymonthday?: RRuleOptions['bymonthday'];
  byyearday?: RRuleOptions['byyearday'];
  byweekno?: RRuleOptions['byweekno'];
  byweekday?: RRuleOptions['byweekday'];
  byhour?: RRuleOptions['byhour'];
  byminute?: RRuleOptions['byminute'];
  bysecond?: RRuleOptions['bysecond'];

  // ms timestamps; undefined => unbounded side (clamped to domain)
  starts?: number;
  ends?: number;
}

export interface RuleJson {
  effect: instantStatus;        // 'active' | 'blackout'
  duration: string;             // ISO-8601 (e.g., 'PT1H', 'P1M')
  options: RuleOptionsJson;
  label?: string;
}

export interface RRStackJsonV1 {
  version: 1;
  timezone: string;             // IANA time zone
  rules: RuleJson[];
}
```

Class (façade):
```ts
export class RRStack {
  constructor(opts: { timezone: string; rules?: RuleJson[] });

  toJson(): RRStackJsonV1;
  static fromJson(json: RRStackJsonV1): RRStack;

  addRule(rule: RuleJson, position?: number): void;
  swapRules(i: number, j: number): void;
  ruleUp(i: number, steps?: number): void;        // no-op at top or invalid
  ruleDown(i: number, steps?: number): void;      // no-op at bottom or invalid
  ruleToTop(i: number): void;                     // no-op if already top/invalid
  ruleToBottom(i: number): void;                  // no-op if already bottom/invalid

  isActiveAt(ms: number): instantStatus;
  getSegments(fromMs?: number, toMs?: number): Iterable<{ start: number; end: number; status: instantStatus }>;
  classifyRange(fromMs: number, toMs: number): rangeStatus;
  getEffectiveBounds(): { start?: number; end?: number; empty: boolean };
}
```

--------------------------------------------------------------------------------

4) Core algorithms

Compilation (object → RRule):
- For each RuleJson:
  - Determine dtstart: new Date((options.starts ?? domainStartMs)).
  - Determine until: new Date(min(options.ends ?? domainEndMs, domainEndMs)).
  - Construct RRule options:
    • freq, interval, wkst, by* copied through using rrule’s Option types.
    • tzid = stack.timezone (Luxon must be available).
    • dtstart, until set as above; count respected if provided.
  - Parse duration via Luxon Duration.fromISO; reject invalid or non-positive duration.
  - Track flags:
    • isOpenStart = options.starts is undefined
    • isOpenEnd = options.ends is undefined

Rule coverage at an instant:
- For timestamp t (ms):
  - Start = rrule.before(new Date(t), true) → the last occurrence start <= t (if any).
  - End = DateTime.fromMillis(start, { zone }).plus(duration).toMillis()
  - Covered if start <= t < end (clamped to domain).

Cascaded state at an instant:
- status = 'blackout'; for each compiled rule in order:
  - if covers(t): status = rule.effect
- Return status.

Segments over a range:
- Input window [from, to). Clamp to domain; if empty, yield nothing.
- Build event edges for each rule:
  - Enumerate occurrence starts that might overlap [from, to). To include windows that begin before from but extend into it, enumerate starts in [from - ruleHorizonMs, to). We compute ruleHorizonMs conservatively per rule:
    • If duration has fixed milliseconds, horizon = durationMs.
    • If duration uses calendar units (months/years), use a safe upper bound:
      – months → 32 days in ms; years → 366 days in ms (zone-aware add is also acceptable but we keep a conservative bound).
  - For each start s:
    • e = end(s) via Luxon
    • If e <= from or s >= to: skip; else clamp to [from,to): [max(s,from), min(e,to)) and add edges:
      – (t=clampedStart, type='start', ruleIndex)
      – (t=clampedEnd, type='end', ruleIndex)
- Sort edges by (t, typeOrder, ruleIndex):
  - For identical t: process 'end' before 'start' to close old windows before opening new ones.
  - For same type, ascending ruleIndex (stable; later rules will still dominate after re-evaluation).
- Sweep:
  - Maintain covering[ruleIndex]: boolean.
  - Initialize prevT = from; prevStatus = cascaded state at from (using isActiveAt).
  - For each edge e:
    • If e.t > prevT: emit segment [prevT, e.t) with prevStatus.
    • Apply edge: toggle covering[e.ruleIndex] according to type.
    • Recompute status: iterate covering from 0..n-1; the last true wins; if none, 'blackout'.
  - End at to (a sentinel edge ensures closure).

Effective bounds:
- Iterate segments across [domainStartMs, domainEndMs):
  - firstActiveStart = first segment.start with status 'active' (if any)
  - lastActiveEnd = last segment.end with status 'active' (if any)
- If none → empty = true.
- Undefined sides:
  - start undefined iff firstActiveStart === domainStartMs and there exists at least one 'active' rule with isOpenStart true that covers domainStartMs (not vetoed at that instant).
  - end undefined iff lastActiveEnd === domainEndMs and there exists at least one 'active' rule with isOpenEnd true that covers (domainEndMs - 1 ms) (not vetoed at that instant).

--------------------------------------------------------------------------------

5) Module split (services-first; keep files short)

- src/rrstack/types.ts — RuleOptionsJson derives from RRuleOptions (omit
  dtstart/until/tzid); all props optional except freq; adds starts/ends (ms).
- src/rrstack/compile.ts — uses radash shake to drop undefineds and avoid
  verbose manual copies; duration validation simplified (positive ms).
- src/rrstack/coverage.ts — unchanged interface.
- src/rrstack/sweep.ts — fixed Duration inspection via toObject(); horizon
  calculation remains conservative.
- src/rrstack/RRStack.ts — moved class from src/rrstack/index.ts into its own
  file (SRP).
- src/rrstack/index.ts — barrel export only.
- Tests co-located for each module — added

--------------------------------------------------------------------------------

6) Validation & constraints

- Domain constants remain:
  - EPOCH_MIN_MS = 0
  - EPOCH_MAX_MS = 2_147_483_647_000
- Token types:
  - Derive from rrule package (Frequency, Options, WeekdayStr, Weekday).
- Performance guardrails (initial):
  - Limit per-call enumeration by horizon; later add optional maxEdges/maxOccurrences if needed.
- No CLI work; library only.
- Vitest config updated to exclude/watchExclude .rollup.cache to prevent hangs
  and duplicate discovery.

--------------------------------------------------------------------------------

7) Tests (status)

- Added smoke/unit tests previously:
  - types.test.ts, compile.test.ts, coverage.test.ts, sweep.test.ts, rrstack.test.ts
- Added 3-rule scenario: scenario.chicago.test.ts (America/Chicago). [DONE]
- Follow-ups: DST transition tests (spring forward/fall back).
- Vitest now excludes .rollup.cache to prevent hangs/duplicates.

--------------------------------------------------------------------------------

8) Long-file scan (source files > ~300 LOC)

- New modules are all well under 300 LOC.
- No existing module exceeds ~300 LOC.

--------------------------------------------------------------------------------

9) Next steps (implementation plan)

- Add the 3-rule example scenario test (America/Chicago) to validate cascade and DST.
- Add DST edge tests (spring forward/fall back) with Luxon zone math.
- Optional: integrate rrule TZ provider if required for stricter TZ handling across all environments.
- Consider performance guardrails (maxEdges/maxOccurrences) for pathological rules.

--------------------------------------------------------------------------------

Progress Update (2025-08-22 UTC)

- Baseline stabilized; scripts green across typecheck/lint/test/build/docs/knip.
- Introduced RRStack skeleton (types, compile, coverage, sweep, façade) with tests.
- Next: add DST transition tests and 3-rule scenario (America/Chicago).
- Applied Vitest config compatibility fix (normalize configDefaults.exclude/watchExclude to arrays).
