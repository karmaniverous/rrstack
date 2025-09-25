---
title: Algorithms (deep dive)
---

# Algorithms (deep dive)

This page explains the core algorithms that power RRStack: how coverage is
computed in the cascade, how segments are streamed, how ranges are classified,
and how effective bounds are derived — all with timezone/DST‑correct math and
unit‑aware operation.

Goals and constraints

- Time unit is explicit and end‑to‑end:
  - 'ms' → timestamps in milliseconds,
  - 's' → integer seconds (half‑open intervals preserve correctness via end rounding).
- Intervals are half‑open: [start, end).
- All arithmetic is performed in the rule’s IANA timezone; DST transitions are
  handled correctly (spring forward/fall back).
- Later rules override earlier ones at covered instants (last‑wins cascade).

Core coverage primitives

- Spans (continuous coverage):
  - options.freq omitted → span rule; duration must be omitted,
  - start/end clamps live in options.starts/options.ends (open sides allowed),
  - coverage test: s <= t < e (open sides use domainMin()/domainMax()).
- Recurrences (RRULE based):
  - options.freq present (daily/weekly/monthly/etc.),
  - dtstart/until/tzid synthesized from JSON (unit/timezone aware),
  - occurrence end computed by adding the rule’s Duration in the rule timezone.

Key helpers (src/rrstack/coverage/time.ts)

- epochToWallDate(value, tz, unit) → Date: epoch→floating wall‑clock Date for rrule.
- floatingDateToZonedEpoch(date, tz, unit) → number: back to epoch for comparisons.
- computeOccurrenceEnd(rule, start) → number: Luxon add in rule tz; rounds up in 's' mode.
- domainMin() = 0; domainMax(unit) is a very large bound (not used for scans).

Cascade evaluation (last‑wins)

- At any instant t, the cascade status is the effect of the last rule in the list that covers t.
- “Covering” is per rule:
  - span: numeric range check,
  - recurrence: find the last start <= t and check end > t (half‑open).

## Point query: isActiveAt(t)

API: RRStack.isActiveAt(t: number): boolean

Strategy (src/rrstack/coverage.ts → ruleCoversInstant; src/rrstack/RRStack.queries.ts):

1. Spans: s <= t < e (open sides use domain min/max).
2. Recurrences: robust coverage in three cooperative steps:
   - Enumerate starts on the local calendar day of t (rrule.between(day, day+1)):
     - Test both the floating Date epoch and the “zoned” epoch candidate for each start,
     - This is fast and avoids large jumps; also catches DST‑boundary subtlety.
   - Structural matches for common patterns:
     - DAILY times (byhour/byminute/bysecond),
     - Common MONTHLY/YEARLY patterns (byweekday/bysetpos/bymonthday/bymonth).
   - Fallback: small backward horizon enumeration:
     - Compute horizon relative to frequency/interval/duration (enumerationHorizon),
     - Enumerate rrule.between(windowStart, wallT) and check coverage with computeOccurrenceEnd.
3. Cascade status:
   - Scan rules in order; last rule whose “covers” is true decides active/blackout at t.

Complexity: O(n + occurrences near t), where n = number of rules. The fallback window is small and bounded.

Notes

- 's' time unit: computeOccurrenceEnd rounds up to the next integer second (still [start, end) at integer boundaries).
- Timezone/DST: coverage/end are computed in the rule tz; “01:30 + 1h” over DST behaves correctly.

## Streaming segments: getSegments(from, to)

API: RRStack.getSegments(from: number, to: number, { limit? }): Iterable<{ start, end, status }>

Intent

- Stream contiguous cascade segments over [from, to) with half‑open semantics.
- Memory bounded; no pre‑materialization of all occurrences.

Algorithm (src/rrstack/segments.ts)

1. Initialize per‑rule state at “from”:
   - covering[i] = whether rule i covers “from”,
   - nextStart[i] = next start >= from,
   - nextEnd[i] = end for the current or next occurrence,
   - For spans: pre‑clip [start, end) to [from, to), set nextStart/nextEnd accordingly.
2. Event loop:
   - t = minBoundary(nextStart[], nextEnd[]) (earliest upcoming boundary),
   - If t is undefined or t >= to: emit the tail segment [prevT, to) and stop,
   - Process end boundaries at t before start boundaries at t,
   - Update covering[] accordingly; advance nextStart for rules whose start fired (rrule.after at wall‑clock t, false),
   - Compute new cascade status; if it changed, emit [prevT, t) and set prevT = t.
3. Optional limit:
   - If emissions would exceed the limit, throw (no silent truncation).

Edge cases

- from === to → no segments,
- Ends before starts at the same timestamp to preserve last‑wins intra‑instant semantics,
- 's' rounding ensures we don’t produce zero‑length segments from integer boundaries.

Complexity: O(k log m) by intuition, but here “heap” is realized by scanning arrays and selecting min; with small m (rules) this is fast and simple. Memory usage is bounded.

## Range classification: classifyRange(from, to)

API: RRStack.classifyRange(from, to): 'active' | 'blackout' | 'partial'

Implementation (src/rrstack/segments.ts)

- We stream getSegments(from, to) and track:
  - sawActive if any segment.status === 'active',
  - sawBlackout if any segment.status === 'blackout'.
- Early exit: if we see both, return 'partial'.
- End logic:
  - if only active segments: 'active',
  - if only blackout segments (or no segments): 'blackout'.

Complexity: O(#segments) over the window; memory bounded and streaming.

## Effective bounds: getEffectiveBounds()

API: RRStack.getEffectiveBounds(): { start?: number; end?: number; empty: boolean }

Intent

- Compute the earliest instant the cascade ever becomes active (start; omitted if open start),
- Compute the latest instant after which the cascade is never active again (end; omitted if open end),
- empty signals “no active coverage exists” (both bounds undefined and no coverage).

Key properties preserved

- Half‑open intervals: [start, end),
- Timezone‑ and unit‑aware,
- No far‑future rrule scans (performance is constant for open‑ended schedules and bounded for finite ones).

Orchestration (src/rrstack/bounds.ts)

1. Earliest start (computeEarliestStart: src/rrstack/bounds/earliest.ts)
   - Pre‑pass: choose earliest active vs blackout candidates:
     - Spans: candidate at start clamp (open start uses domainMin()),
     - Recurrences: rrule.after(wall(domainMin), true).
   - If earliest active precedes earliest blackout:
     - If open‑start coverage exists at domainMin (active + isOpenStart), return start: undefined,
     - Else return that active instant.
   - Otherwise, run a small candidate‑filtered forward sweep to find the first instant the cascade turns active.

2. Open‑end detection (detectOpenEnd: src/rrstack/bounds/openEnd.ts)
   - Pure stack inspection, O(1); no far‑future probe:
     - The cascade is open‑ended iff the last open‑ended candidate is an active source:
       - Active open span (kind === 'span' and isOpenEnd),
       - Active recurrence with no until and no count that produces any start (isOpenEnd + hasAnyStart()),
       - Baseline active (compiled as open span).
     - A blackout open‑ended span closes the future; it does not make the cascade open‑ended.
   - If open‑ended is true, latest bound is undefined.

3. Latest end (computeLatestEnd: src/rrstack/bounds/latest.ts)
   - No far‑future scans; bounded and local:
     - Compute a finite probe = max end across all finite contributors (spans with end; recurrences with count or until).
     - Choose cursorStart = min(externalProbe, finiteProbe) to preserve legacy “strictly before probe window” semantics in tests.
     - Short‑circuit: only when cursorStart equals finiteProbe and the cascade is active immediately before cursorStart → return cursorStart (half‑open semantics).
     - Otherwise, run a bounded reverse sweep from cursorStart:
       - For spans: supply previous start/end if < cursor; mark covering when end > cursor >= start.
       - For recurrences: find last start before cursor; if end >= cursor, step to the previous occurrence (strict e >= cursor guard); build prevStart/prevEnd per rule; recompute covering[].
       - At each iteration, pick the latest boundary among prevStart/prevEnd; update covering; test whether the cascade just transitioned to active (wasBlackout && isActiveNow) → return that boundary.
     - If no earlier transition is found, return cursorStart (covers “tie at probe” and pure finite cases).

4. Emptiness (isCascadeInactiveEverywhere: src/rrstack/bounds.ts)
   - Not empty if any open‑ended active source exists (active open span; infinite active recurrence with any start),
   - Not empty if any finite active contributor exists (span with end > start; recurrence with any first start),
   - Otherwise empty.

Correctness notes

- Open start: if coverage is already active at the domain minimum due to an open‑start active source, earliest start is omitted (undefined).
- Open end: if any open‑ended active source exists and no later open‑ended blackout span permanently closes the future, the cascade is open‑ended (end === undefined).
- Ties and overlays:
  - “End before start” processing at a shared timestamp gives blackout the chance to truncate a coincident active,
  - The reverse sweep honors last‑wins overlays on the last day (e.g., a blackout that suppresses the last active).
- RRULE 'until' is inclusive of a start at that instant; half‑open intervals keep [start, end) correct via computeOccurrenceEnd.

Performance

- Earliest start: O(n) + a handful of rrule.after calls; small forward sweep only when needed.
- Open‑end detection: O(n), stack inspection; no scans to 2099.
- Latest end: bounded:
  - Finite probe uses local enumeration only for count/ until contributors,
  - The reverse sweep starts at a finite cursor and walks backwards via rrule.before and numeric spans,
  - No global scans from 1970 or to far‑future.
- Open‑ended schedules return in ~constant time; common daily/weekly patterns avoid expensive probes.

Examples & scenarios

1. Closed daily rule (UTC)

- Rule A: Active daily 05:00–06:00, Jan 10–12.
- Bounds:
  - earliest start → 2024‑01‑10 05:00,
  - latest end → 2024‑01‑11 06:00 (the last occurrence end),
  - empty: false.

2. Blackout override on the last day

- Rule A: Active daily 05:00–06:00, Jan 10–12,
- Rule B: Blackout Jan 11 at 05:00–06:00,
- Bounds:
  - earliest start → 2024‑01‑10 05:00,
  - latest end → 2024‑01‑10 06:00 (blackout suppresses the last day),
  - empty: false.

3. Same‑instant tie (blackout and active start at the same instant)

- On the first day, blackout and active both start at 05:00–06:00,
- The blackout is later in the list → the first day is suppressed;
- Bounds:
  - earliest start → next day’s 05:00,
  - latest end → that day’s 06:00,
  - empty: false.

4. Open start with finite end clamp

- Rule A: Active 00:00–00:30 daily, ends at 1970‑01‑02 (open start),
- Rule B: Early blackout 1970‑01‑01 00:10–00:20,
- Bounds:
  - start: undefined (coverage begins at domain min with open start),
  - end: 1970‑01‑02 00:30 (inclusive of the 00:00 start at 'until'),
  - empty: false.

5. Weekend open‑ended schedule (America/New_York)

- Rule A: Active weekly Saturday 00:00 for 48 hours (2 days),
- No end clamp; baseline blackout.
- Bounds:
  - earliest start → first Saturday 00:00 in the domain (unless open start is chosen),
  - latest end → undefined (open‑ended coverage),
  - empty: false.

## DST and time‑unit semantics

Timezone/DST

- All coverage is computed in the rule timezone via Luxon,
- DST behavior is correct:
  - Spring forward (America/Chicago 2021‑03‑14 01:30 + 1h → 03:30 local),
  - Fall back (2021‑11‑07 01:30 + 1h → 01:30 local, repeated hour).

's' mode rounding

- In 's' mode, computeOccurrenceEnd rounds up to the next integer second:
  - Preserves [start, end) against boundary false negatives at integer seconds,
  - Keeps duration spans exact integer seconds across DST.

## Complexity & performance summary

- isActiveAt: O(n + small local enumeration); no global scans.
- getSegments: streaming, memory bounded; complexity proportional to the number of boundary events in [from, to).
- classifyRange: O(#segments) over the window; early‑exit on 'partial'.
- getEffectiveBounds:
  - earliest: O(n) + small sweep,
  - open‑end detection: O(n), probe‑free,
  - latest: bounded, starts from a finite probe; reverse sweep is local; no 1970→2099 scans.

## Troubleshooting & FAQs

- “Why is end undefined for my open‑ended rule?”
  - Because there is no finite latest instant after which the cascade is never active again; open‑ended schedules intentionally return end: undefined.
- “How do blackout overlays affect the last day?”
  - When a blackout and an active tie on a boundary, ends are processed before starts to respect last‑wins; the reverse sweep ensures blackout suppression reduces the last active end accordingly.
- “What does 's' rounding do?”
  - Ends are rounded up to the next second; intervals remain half‑open and integer‑second safe.
- “How are clamps handled?”
  - starts/ends map to dtstart/until; RRULE 'until' is inclusive of a start at that instant; RRStack keeps intervals half‑open via occurrence end math.
  - spans use numeric clamps directly (open sides allowed).

References (selected sources)

- src/rrstack/coverage.ts — ruleCoversInstant orchestration,
- src/rrstack/segments.ts — streaming segment engine,
- src/rrstack/bounds/\*.ts — earliest/openEnd/latest passes and orchestrator,
- src/rrstack/coverage/time.ts — unit/timezone helpers and DST‑correct end math.
