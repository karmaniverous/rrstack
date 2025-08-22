# RRStack — Requirements and Development Plan

Last updated: 2025-08-22 (UTC)

This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

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
    • Set prevT = e.t; prevStatus = recomputed.
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

- src/rrstack/types.ts
  - Export public types: instantStatus, rangeStatus, RuleOptionsJson, RuleJson, RRStackJsonV1.
  - Re-export or import rrule types (Frequency, Options, WeekdayStr, etc.). No re-declared token unions.
- src/rrstack/compile.ts
  - compileRule(rule: RuleJson, timezone: string): CompiledRule
  - toRRuleOptions(options: RuleOptionsJson, timezone: string): RRuleOptions
  - Validations (bounds clamped to domain; duration valid).
- src/rrstack/coverage.ts
  - ruleCoversInstant(compiledRule, tMs, timezone): boolean
  - computeOccurrenceEndMs(compiledRule, startMs, timezone): number
  - enumerateStarts(rule, fromMs, toMs, horizonMs): number[]
- src/rrstack/sweep.ts
  - getSegments(compiledRules[], fromMs, toMs, timezone): Iterable<{ start, end, status }>
  - classifyRange(...): rangeStatus (built on getSegments)
  - getEffectiveBounds(...): { start?, end?, empty }
- src/rrstack/index.ts
  - RRStack class façade: constructor, serialization, ordering (swapRules/ruleUp/ruleDown/ruleToTop/ruleToBottom), isActiveAt, getSegments, classifyRange, getEffectiveBounds.
- Tests (co-located):
  - types.test.ts (light)
  - compile.test.ts
  - coverage.test.ts (covers DST)
  - sweep.test.ts
  - rrstack.test.ts (integration; example scenario; bounds; ordering).

All modules targeted to stay well under ~300 LOC; split above enforces SRP and testability.

--------------------------------------------------------------------------------

6) Validation & constraints

- Domain constants:
  - EPOCH_MIN_MS = 0
  - EPOCH_MAX_MS = 2_147_483_647_000
- Token types:
  - Derive from rrule package (Frequency, Options, WeekdayStr, Weekday).
- Performance guardrails (initial):
  - Limit per-call enumeration by horizon; later add optional maxEdges/maxOccurrences if needed.
- No CLI work; library only.

--------------------------------------------------------------------------------

7) Tests (outline)

- Timezone/DST correctness:
  - Zone with DST (America/Chicago). Verify 5–6am windows across DST transitions remain consistent via Luxon addition.
- Rule cascade semantics:
  - Active then blackout overlap → blackout segments prevail.
  - Blackout then active overlap → re-activated segments prevail.
  - Non-overlapping leave baseline intact.
- Bounds:
  - Open-start/End rules produce undefined side only if activity touches domain edge and remains active at that instant despite later rules.
  - Finite starts/ends respected; clamped correctly.
- Range classification:
  - Entirely active → 'active'
  - Entirely blackout → 'blackout'
  - Mixed → 'partial'
- Example scenario (3 rules) with explicit dates to cover July behavior and 20th re-activation.

--------------------------------------------------------------------------------

8) Long-file scan (source files > ~300 LOC)

Scanned current src/*:
- src/foo.ts (~30 LOC)
- src/index.ts (<20 LOC)
- src/cli/mycli/*.ts (each <50 LOC)
- No source files exceed ~300 LOC. Planned modules will be kept small by design.

--------------------------------------------------------------------------------

9) Next steps (implementation plan)

- Add dependencies: rrule, luxon (and zod optionally).
- Implement src/rrstack/types.ts (public types).
- Implement src/rrstack/compile.ts with tests.
- Implement src/rrstack/coverage.ts with tests.
- Implement src/rrstack/sweep.ts (segments, classifyRange, bounds) with tests.
- Implement src/rrstack/index.ts (RRStack class) with tests.
- Provide example tests for the 3-rule scenario and DST edges.
- Wire exports in src/index.ts.

Notes:
- All internal property names are camelCase (starts, ends).
- Range end is exclusive across methods.
- getSegments defaults (from,to) to domain edges but callers should pass finite windows in practice.
