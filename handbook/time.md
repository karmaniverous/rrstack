---
title: Time & timezones
---

# Time & timezones

RRStack computes all coverage in the rule’s IANA time zone and uses Luxon for duration arithmetic. This page covers helper functions for converting between “wall‑clock” values in a zone and epoch values, as well as DST semantics.

## Conversions (wall time ↔ epoch)

```ts
import {
  wallTimeToEpoch,
  dateOnlyToEpoch,
  epochToWallDate,
  RRStack,
} from '@karmaniverous/rrstack';

const tz = RRStack.asTimeZoneId('Europe/Paris');

// Interpret Date’s UTC Y/M/D/H/M/S as a local wall time in `tz`.
const wall = new Date(Date.UTC(2025, 6, 20, 9, 0, 0)); // "09:00" floating time-of-day
const tMs = wallTimeToEpoch(wall, tz, 'ms');

// Midnight local (date-only clamp)
const dateOnly = new Date(Date.UTC(2025, 6, 20, 0, 0, 0));
const midnight = dateOnlyToEpoch(dateOnly, tz, 'ms');

// Floating Date from epoch (UTC fields == local clock fields in tz)
const floater = epochToWallDate(tMs, tz, 'ms');
// wallTimeToEpoch(floater, tz, 'ms') === tMs
```

### Validation & errors

- Throws `RangeError('Invalid Date')` for invalid `Date`.
- Throws `RangeError('Invalid time zone')` for unrecognized IANA zone.
- Throws `RangeError('Invalid time unit')` for invalid unit.

### DST behavior

- “Spring forward” (skipped hour): invalid wall times map to the next valid instant (e.g., 02:30 → 03:00 local).
- “Fall back” (repeated hour): ambiguity resolves to the earlier offset (Luxon defaults).
- In `'s'` mode, returns integer seconds (truncation for conversions). Occurrence ends elsewhere round up (see below).

## Time units & rounding policy (library‑wide)

- Intervals are half‑open: `[start, end)`.
- Seconds mode (`'s'`): occurrence end times are rounded up to the next second to avoid boundary false negatives.
- Time helpers return:
  - `'ms'`: millisecond precision.
  - `'s'`: integer seconds (truncation).

## Formatting instants

```ts
const s = new RRStack({ timezone: 'UTC' });
s.formatInstant(Date.UTC(2024, 0, 2, 5, 30, 0)); // '2024-01-02T05:30:00Z'

// Custom format & locale (Luxon)
s.formatInstant(Date.UTC(2024, 0, 2, 5, 30, 0), { format: 'yyyy-LL-dd HH:mm' });
// '2024-01-02 05:30'
```

## UI mapping tips

- For “date‑only” pickers: round‑trip via `dateOnlyToEpoch(selectedDate, stack.timezone, unit)` to get local midnight in the rule’s zone.
- For “time‑of‑day”: keep hour/minute as numbers; rrule interprets these in the rule’s timezone.
- Prefer `stack.formatInstant(t, { format })` for previews in the stack’s timezone.

## See also

- Public API and types: [Core API and Types](./api.md)
- Descriptions and bounds formatting: [Rule descriptions](./descriptions.md)
- Algorithms (DST‑correct end computation): [Algorithms (deep dive)](./algorithms.md)
