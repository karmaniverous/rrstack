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

By default, boolean options are opt‑in: `includeTimeZone` is false, `includeBounds` is false.

## Basic usage

Instance method

```ts
const text = stack.describeRule(0);
// e.g., "Active for 1 hour every day at 5:00"

const withZone = stack.describeRule(0, { includeTimeZone: true });
// e.g., "Active for 1 hour every day at 5:00 (timezone UTC)"
```

Pure helper (compile on the fly)

```ts
import { describeRule, RRStack } from '@karmaniverous/rrstack';

const text = describeRule(ruleJson, RRStack.asTimeZoneId('UTC'), 'ms');
// default: timezone label omitted
```

## Options

```ts
export interface DescribeOptions {
  includeTimeZone?: boolean; // "(timezone <tz>)"
  includeBounds?: boolean; // append "[from …; until …]" when clamps exist
  formatTimeZone?: (tzId: string) => string; // customize tz label
  boundsFormat?: string; // Luxon format for bound timestamps (when includeBounds)
  translator?: 'strict-en' | DescribeTranslator;
  translatorOptions?: TranslatorOptions;
}
```

Translator options (`strict-en`):

```ts
export interface TranslatorOptions {
  frequency?: Partial<FrequencyLexicon>; // labels for "every day/week/..."
  timeFormat?: 'hm' | 'hms' | 'auto'; // 24h or 12h handled via hourCycle
  hourCycle?: 'h23' | 'h12';
  ordinals?: 'long' | 'short'; // "third" vs "3rd"
  locale?: string; // Luxon setLocale
  lowercase?: boolean; // default true
}
```

## Bounds formatting

When `includeBounds` is true, descriptions append brackets:

```
[from <formatted-from>; until <formatted-until>]
```

- `boundsFormat` customizes the timestamp rendering (Luxon `toFormat`) in the rule’s timezone.
- When omitted, ISO strings are used with milliseconds suppressed.
- For spans (no recurrence), bounds reflect numeric `[starts, ends)`.

Examples:

```ts
stack.describeRule(0, {
  includeBounds: true,
  boundsFormat: 'yyyy-LL-dd HH:mm',
});
// "... [from 2025-04-01 00:00; until 2025-04-02 00:00]"
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
// "Active for 1 hour every month on the third tuesday at 5:00"
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
// "Active for 1 hour every month on the last tuesday at 5:00"
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
// "Active for 1 hour every month on the 15th at 5:00"
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
// "Active for 1 hour every year in january, march and july at 5:00"
```

## Frequency lexicon (UI helpers)

```ts
export type FrequencyAdjectiveLabels = Record<FrequencyStr, string>;
export type FrequencyNounLabels = Record<FrequencyStr, string>;

export interface FrequencyLexicon {
  adjective: FrequencyAdjectiveLabels;
  noun: FrequencyNounLabels;
  pluralize?: (noun: string, n: number) => string;
}
```

Exports:

- `FREQUENCY_ADJECTIVE_EN`, `FREQUENCY_NOUN_EN`, `FREQUENCY_LEXICON_EN`
- `toFrequencyOptions(labels?)` → ordered options for pickers

See type definitions in [Core API and Types](./api.md#types-selected).

## See also

- Translator options and labels: [Core API and Types](./api.md)
- Bounds & time formats: [Time & timezones](./time.md)
