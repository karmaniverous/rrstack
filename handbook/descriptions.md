---
title: Descriptions
---

# Rule descriptions (pluggable translators)

RRStack produces plain‑language descriptions of rules by compiling a normalized descriptor (AST) and rendering it through a translator. The built‑in translator, “strict‑en,” generates clear English phrases for common RRULE patterns and continuous spans.

Highlights

- Coverage: daily time windows, weekly weekday lists, monthly nth/last weekday and by‑month‑day, yearly single and multiple months
- Effect and duration phrasing (“Active for 1 hour …”)
- Interval phrasing (“every N {plural(noun)}”)
- COUNT/UNTIL (“for N occurrences”, “until YYYY‑MM‑DD”)
- Local time formatting in the rule’s timezone

By default, boolean options are opt‑in: includeTimeZone is false, includeBounds is false.

## Basic usage

Instance method

```ts
const text = stack.describeRule(0);
// e.g., "Active for 1 hour: every day at 5:00"

const withZone = stack.describeRule(0, { includeTimeZone: true });
// e.g., "Active for 1 hour: every day at 5:00 (timezone UTC)"
```

Pure helper (compile on the fly)

```ts
import { describeRule, RRStack } from '@karmaniverous/rrstack';

const text = describeRule(ruleJson, RRStack.asTimeZoneId('UTC'), 'ms');
// default: timezone label omitted
```

## Translator options (strict‑en)

```ts
type TranslatorOptions = {
  timeFormat?: 'hm' | 'hms' | 'auto'; // default 'hm'
  hourCycle?: 'h23' | 'h12'; // default 'h23'
  ordinals?: 'long' | 'short'; // default 'long'
  locale?: string; // BCP-47, applied via Luxon
  lowercase?: boolean; // default true
};
```

Examples

```ts
// 12-hour clock with seconds, short ordinals
const pretty = describeRule(
  rule,
  RRStack.asTimeZoneId('America/Chicago'),
  'ms',
  {
    translatorOptions: {
      hourCycle: 'h12',
      timeFormat: 'hms',
      ordinals: 'short',
    },
  },
);
// "Active for 1 hour: every day at 9:00:00 AM"
```

## Common patterns

Monthly — third Tuesday

```ts
import { RRule } from 'rrule';
const text = describeRule(
  {
    effect: 'active',
    duration: { hours: 1 },
    options: {
      freq: 'monthly',
      bysetpos: 3,
      byweekday: [RRule.TU],
      byhour: [5],
      byminute: [0],
      bysecond: [0],
    },
  },
  RRStack.asTimeZoneId('UTC'),
  'ms',
);
// "Active for 1 hour: every month on the third tuesday at 5:00"
```

Monthly — last Tuesday

```ts
import { RRule } from 'rrule';
const text = describeRule(
  {
    effect: 'active',
    duration: { hours: 1 },
    options: {
      freq: 'monthly',
      byweekday: [RRule.TU.nth(-1)],
      byhour: [5],
      byminute: [0],
      bysecond: [0],
    },
  },
  RRStack.asTimeZoneId('UTC'),
  'ms',
);
// "Active for 1 hour: every month on the last tuesday at 5:00"
```

Monthly — by‑month‑day

```ts
const text = describeRule(
  {
    effect: 'active',
    duration: { hours: 1 },
    options: {
      freq: 'monthly',
      bymonthday: [15],
      byhour: [5],
      byminute: [0],
      bysecond: [0],
    },
  },
  RRStack.asTimeZoneId('UTC'),
  'ms',
);
// "Active for 1 hour: every month on the 15th at 5:00"
```

Yearly — multiple months

```ts
const text = describeRule(
  {
    effect: 'active',
    duration: { hours: 1 },
    options: {
      freq: 'yearly',
      bymonth: [1, 3, 7],
      bymonthday: [5],
      byhour: [5],
      byminute: [0],
      bysecond: [0],
    },
  },
  RRStack.asTimeZoneId('UTC'),
  'ms',
);
// "Active for 1 hour: every year in january, march and july at 5:00"
```

## Bounds and timezone label

```ts
const text = describeRule(rule, RRStack.asTimeZoneId('UTC'), 'ms', {
  includeTimeZone: true, // "(timezone UTC)"
  includeBounds: true, // "[from …; until …]" when clamps exist
  formatTimeZone: (tz) => (tz === 'UTC' ? 'Coordinated Universal Time' : tz),
});
```

### Bounds format (custom date rendering)

You can customize how clamp bounds are rendered when `includeBounds` is true.
Pass `boundsFormat` to `describeRule`/`stack.describeRule`. It uses Luxon’s
`toFormat(boundsFormat)` in the rule’s timezone.

```ts
// ISO with Z is used when boundsFormat is omitted.
const text1 = stack.describeRule(0, {
  includeBounds: true,
  boundsFormat: 'yyyy-LL-dd', // e.g., "from 2025-04-01; until 2025-04-02"
});

// With both zone label and custom bounds format
const text2 = stack.describeRule(0, {
  includeTimeZone: true,
  includeBounds: true,
  boundsFormat: "dd LLL yyyy 'at' HH:mm",
});
```

## Frequency lexicon (UI helpers)

Exported from `@karmaniverous/rrstack`:

- Constants: `FREQUENCY_LEXICON_EN`, `FREQUENCY_ADJECTIVE_EN`, `FREQUENCY_NOUN_EN`
- Types: `FrequencyLexicon`, `FrequencyAdjectiveLabels`, `FrequencyNounLabels`
- Helper: `toFrequencyOptions(labels?)` → ordered frequency options for pickers

```ts
import { toFrequencyOptions } from '@karmaniverous/rrstack';
const options = toFrequencyOptions(); // [{ value: 'yearly', label: 'yearly' }, ...]
```

## Tips

- Boolean options default to false (opt‑in); pass `{ includeTimeZone: true }` to append the timezone label.
- COUNT/UNTIL appended as “for N occurrences” / “until YYYY‑MM‑DD”.
- You can swap in a different translator in the future; the descriptor shape is stable and independent of rrule’s runtime objects.
