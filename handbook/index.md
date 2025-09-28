---
title: Handbook
children:
  - ./overview.md
  - ./algorithms.md
  - ./react.md
  - ./descriptions.md
  - ./performance.md
---

# RRStack Handbook

Welcome to the RRStack handbook. This section contains practical, narrative
documentation that complements the API reference and guides you through common
workflows, patterns, and integration points.

## Contents

- Overview

  See an end-to-end introduction to RRStack:
  - Why this library and when to use it
  - Key capabilities (point queries, streaming segments, range classification,
    effective bounds, JSON round-tripping, human-readable rule descriptions)
  - Time zone and DST behavior
  - Quick Start and tips for long windows and performance

  Read: [Overview](./overview.md)

- React hooks

  Integrate a live RRStack instance with React using tiny hooks that preserve
  the library as the single source of truth:
  - useRRStack({ json, onChange?, resetKey?, changeDebounce?, mutateDebounce?,
    renderDebounce?, logger? }) — returns
    { rrstack, version, flushChanges, flushMutations, cancelMutations, flushRender }
  - useRRStackSelector({ rrstack, selector, isEqual?, renderDebounce?, logger?,
    resetKey? }) — returns { selection, version, flushRender } with minimal
    re-renders

- Descriptions

  Pluggable translators for human-friendly rule descriptions (strict-en
  included), translator options (time format, hour cycle, ordinals, locale),
  and examples for common cadences.