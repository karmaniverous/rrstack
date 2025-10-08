---
title: Performance
---

# Performance and benchmarking

RRStack includes micro‑benchmarks (vitest bench) to spot‑check hot paths and validate performance characteristics across scenarios.

## Running benches

```bash
npm run bench
```

Vitest reports ops/second (hz), mean, and relative margin of error (rme). Treat bench outputs as comparative within the same environment. Expect variance across CI and developer machines.

## What’s benchmarked

Core flows

- `getEffectiveBounds` across representative shapes:
  - baseline active (no rules)
  - daily open‑ended vs closed windows
  - monthly nth weekday (open/closed)
  - count/UNTIL‑bounded series
  - reverse‑sweep stress (ambiguous pre‑pass)
- `isActiveAt` samples across a day
- `getSegments`/`classifyRange` over small windows

Mutators

- Node‑only mutators:
  - add first rule (0→1), add second rule (1→2), remove last (1→0)
  - swap/up/down/top/bottom on size‑3 lists
- React façades:
  - add/remove/swap/up/down/top/bottom
  - rules setter (bulk replace), `toJson`

The React benches run under happy‑dom and wrap operations in `React.act(...)` for deterministic timing.

## Reading results

- `hz` — higher is faster; compare within the same machine/session.
- `mean` — average per‑iteration time; use `rme` to gauge stability.
- Typical observations:
  - `isActiveAt` is very fast; operations are local and avoid far‑future scans.
  - `getEffectiveBounds` varies by shape; open‑ended detection is O(1), while finite windows may use local sweeps to find the latest active end without scanning far future.
  - `getSegments` is streaming and memory‑bounded; longer windows with overlapping rules yield more boundary events.

## Tips

- Long windows & overlaps: prefer chunking by day/week and pass `{ limit }` to `getSegments` to cap enumeration explicitly (throws if exceeded).
- Use Workers or requestIdleCallback for heavy sweeps in UI apps.
