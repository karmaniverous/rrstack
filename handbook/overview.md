---
title: Overview
---

# RRStack overview

RRStack composes a prioritized stack of time‑based rules (rrule + optional continuous spans) to:

- Answer point queries: `isActiveAt(t)` — boolean.
- Stream contiguous segments: `getSegments(from, to)` — half‑open `[start, end)`.
- Classify windows: `classifyRange(from, to)` — `'active' | 'blackout' | 'partial'`.
- Compute effective bounds with open‑sided detection: `getEffectiveBounds()`.

Key traits

- Timezone/DST correctness — all coverage computed in the rule’s IANA time zone; duration arithmetic via Luxon.
- Half‑open intervals — in `'s'` mode, end times round up to avoid boundary false negatives.
- JSON persistence — `toJson()` and `new RRStack(json)` round‑trip your stack; `update(partial, policy)` handles version and time‑unit changes with notices.
- Pure library surface — no I/O side effects; works in Node, browsers, and workers.

If you’re new, continue with [Getting started](./getting-started.md). To browse the callable surface and types, see [Core API and Types](./api.md).
