---
title: Performance
---

# Performance and benchmarking

RRStack includes micro-benchmarks (vitest bench) to spot-check hot paths and validate performance characteristics across scenarios.

## Running benches

```bash
npm run bench
```

Vitest reports ops/second (hz), mean, and relative margin of error (rme). Treat bench outputs as _comparative_ within the same environment (machine/Node/power). Expect variance across CI and developer machines.

## What’s benchmarked

Core flows

- getEffectiveBounds across representative shapes:
  - baseline active (no rules)
  - daily open‑ended vs closed windows
  - monthly nth weekday (open/closed)
  - count/UNTIL‑bounded series
  - reverse‑sweep stress (ambiguous pre‑pass)
- isActiveAt samples across a day
- getSegments/classifyRange over small windows

Mutators

- Node‑only (“pure” RRStack) mutators:
  - add first rule (0→1), add second rule (1→2)
  - remove last (1→0)
  - swap(0,last), up(last), down(0), top(last), bottom(0)
- React façade benches:
  - add first rule, add second rule
  - remove/swap/up/down/top/bottom
  - rules setter (bulk replace), toJson

The React benches run under happy-dom and wrap operations in `React.act()` for deterministic timing. Results include façade/proxy overhead and (when enabled) Debounce/commit behavior.

## Reading results

- `hz` (ops/s) — higher is faster; compare runs within the same machine/session.
- `mean` — average per-iteration time; look at rme to gauge stability.
- `rme` — relative margin of error; lower is more stable.

Typical observations

- `isActiveAt` is very fast; operations are local and avoid far-future scans.
- `getEffectiveBounds` varies by shape; open-ended detection is O(1), while finite windows may use local sweeps to find the latest active end without scanning far future.
- `getSegments` is streaming and memory-bounded; longer windows with overlapping rules can yield more boundaries and thus more work.

## Mutator considerations

Fixed pre-states for fair comparisons

- To compare “add paths” fairly across Node-only and React façades, use fixed pre-states:
  - add first rule (0→1)
  - add second rule (1→2)
- For constant-size costs, consider “add‑replace” (replace last/index) which avoids the growth effects of an ever-larger rules array.

Immediate vs staged (React)

- `mutateDebounce` stages frequent edits and commits once per window; `flushMutations()` forces an immediate commit when needed (e.g., Save Now).
- `changeDebounce` coalesces autosave calls (`onChange`); `flushChanges()` fires pending trailing autosaves immediately.
- `renderDebounce` coalesces paint churn from `rrstack` notifications.

## Tips

- Long windows & overlaps: prefer chunking by day/week and pass `{ limit }` to `getSegments` to cap enumeration explicitly (throws if exceeded).
- Node versions: collect a simple markdown snapshot across Node LTS releases if you need to track relative improvements/regressions over time.
