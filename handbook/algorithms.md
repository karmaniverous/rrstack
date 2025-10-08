---
title: Algorithms (deep dive)
---

# Algorithms (deep dive)

This page explains the core algorithms that power RRStack: how coverage is computed in the cascade, how segments are streamed, how ranges are classified, and how effective bounds are derived — all with timezone/DST‑correct math and unit‑aware operation.

Goals and constraints

- Time unit is explicit and end‑to‑end.
- Intervals are half‑open: `[start, end)`.
- All arithmetic is performed in the rule’s IANA timezone; DST transitions are handled correctly (spring forward/fall back).
- Later rules override earlier ones at covered instants (last‑wins cascade).

Baseline (defaultEffect)

- The baseline behaves like a virtual, open‑ended span rule prepended to the cascade (lowest priority).
- Values:
  - `'auto'` (default): opposite of the first rule’s effect, or `'active'` when no rules exist.
  - `'active' | 'blackout'`: use exactly that effect for uncovered instants.

Core coverage primitives

- Spans (continuous coverage):
  - Omit `options.freq` → span rule; duration must be omitted.
  - Coverage is continuous across `[starts, ends)`; either side may be open.
- Recurrences (RRULE based):
  - `options.freq` present (daily/weekly/monthly/etc.).
  - `dtstart/until/tzid` synthesized from JSON (unit/timezone aware).
  - Occurrence end computed by adding the rule’s `Duration` in the rule timezone.

Key helpers

- `epochToWallDate(value, tz, unit) → Date`: epoch → floating wall‑clock Date for rrule.
- `floatingDateToZonedEpoch(date, tz, unit) → number`: to epoch for comparisons.
- `computeOccurrenceEnd(rule, start) → number`: Luxon add in rule tz; rounds up in `'s'` mode.
- `domainMin()`, `domainMax(unit)`: safe guard rails.

Cascade evaluation (last‑wins)

- At any instant `t`, the cascade status is the effect of the last rule in the list that covers `t`.

## Point query: isActiveAt(t)

Strategy (`coverage.ts`):

1. Spans: `s <= t < e` (open sides use domain min/max).
2. Recurrences: robust coverage in three cooperative steps:
   - Day‑window enumeration in the local calendar day of `t`,
   - Structural matches for common patterns (daily times, monthly/yearly patterns),
   - Bounded backward enumeration with rrule and end computation.
3. Cascade status: scan rules in order; last match wins.

## Streaming segments: getSegments(from, to)

Streaming, memory‑bounded merge over per‑rule boundary streams (starts/ends). Ends are processed before starts at the same timestamp to preserve last‑wins semantics. Optional `limit` throws if exceeded. See `segments.ts`.

## Range classification: classifyRange(from, to)

Scans streamed segments; early‑exits on mixed coverage. See `segments.ts`.

## Effective bounds: getEffectiveBounds()

- Earliest bound: candidate‑filtered forward sweep; detects open start when coverage is active at domain minimum due to open‑start sources.
- Open‑end detection: stack inspection (no far‑future probes).
- Latest bound: finite/local probe + bounded reverse sweep; never scans far into the future.

See `bounds/*.ts` for pass details.

## Timezones and DST

- All coverage is computed in the rule’s IANA timezone.
- Occurrence end times use Luxon in the rule’s zone. In `'s'` mode, ends remain exact integer seconds across DST transitions.

## See also

- Public API and types: [Core API and Types](./api.md)
- Configuration and notices: [Configuration & update()](./configuration.md)
- Time helpers and formatting: [Time & timezones](./time.md)
