
# RRStack — Requirements and Development Plan

Last updated: 2025-08-23 (UTC)

This document captures requirements, architecture, contracts, and the implementation plan for RRStack. It will be kept current across iterations.

--------------------------------------------------------------------------------

0) Top Priority — Stabilize template baseline (pre-implementation)

Goals:
- Ensure the template is green and reproducible before adding new code.
- Resolve current warnings and cleanup items introduced during STAN integration.

Tasks:
- Scripts green across the board
  - Verify: npm run typecheck, npm run lint, npm run test, npm run build, npm run docs
  - Fix any warnings that mask real problems (see below).
  - Status: Verified from attached outputs (typecheck/lint/test/build/docs/knip all clean). [DONE]
- Docs warning
  - Current: typedoc warns “CHANGELOG.md did not match any files.”
  - Decision: Added minimal CHANGELOG.md at repo root and kept projectDocuments in typedoc.json. [DONE]
- Docs note (resolved)
  - Previous: TypeDoc warned: “OptionalizeExcept, defined in @karmaniverous/rrstack/src/rrstack/types.ts, is referenced by index.RuleOptionsJson but not included in the documentation.”
  - Decision: Removed the helper alias and defined RuleOptionsJson via Partial/Pick. This eliminates the warning without changing API. [DONE]
- Knip cleanup
  - Current: Unused devDependencies: @types/eslint__js, @types/eslint-config-prettier, @types/fs-extra, fs-extra.
  - Decision: Removed unused devDependencies and deleted unused file src/util/packageName.ts. [DONE]
- CI/workflows sanity
  - Confirm GitHub workflow(s) are still valid post-integration (.github/workflows/sync.yml uses a reusable workflow; ensure secrets configured).
  - Status: Manual validation pending in GitHub; repo-side config unchanged. [PENDING]
- Rollup/TypeScript baseline
  - Confirm rollup builds without warnings (beyond the known incremental plugin note).
  - Ensure src/cli dynamic enumeration (readdir('src/cli')) is valid; if CLI is optional, guard against missing folder (not urgent since folder exists).
  - Decision: Excluded ".stan" from tsconfig to prevent typechecking generated artifacts. [DONE]
  - Status: Build successful; only known @rollup/plugin-typescript incremental warning present. [DONE]
- ESLint/Prettier
  - Run npm run lint and ensure formatting/linting remains deterministic; no unintended changes.
  - Decision: Ignored ".stan/**/*" in ESLint flat config to avoid linting generated artifacts. [DONE]
- Vitest config compatibility
  - Current: Vitest v3 can expose configDefaults.watchExclude as a RegExp; spreading it causes a TypeError.
  - Decision: Normalize configDefaults.exclude/watchExclude to arrays before extending with '**/.rollup.cache/**'. [DONE]
  - Also: Increased global testTimeout to 20000ms to avoid timeouts with rrule enumeration. [DONE]
- .stan guardrails
  - Verify stan.config.yml excludes and outputs are correct.
  - Ensure .stan paths remain committed per STAN policy (system docs and future todo/refactor entries).
  - Status: Verified. [DONE]
- Freeze baseline
  - After the above, commit a “stabilize template” change so future diffs isolate RRStack work.
  - Status: Captured here; subsequent work proceeds under RRStack. [DONE]

--------------------------------------------------------------------------------

1) Requirements (confirmed)
[unchanged]

--------------------------------------------------------------------------------

2) External dependencies (Open-Source First)
[unchanged]

--------------------------------------------------------------------------------

3) Public contracts (service-first; ports)
[unchanged]

--------------------------------------------------------------------------------

4) Core algorithms

- Compilation (object → RRule): unchanged.
- Coverage detection (instant):
  - Day-window enumeration in ruleCoversInstant: enumerate all starts on the local calendar day of t (in rule.tz) and test coverage.
  - Structural tz‑local fallback for MONTHLY/YEARLY nth‑weekday and bymonthday patterns when same‑day rrule enumeration returns none; always applied if coverage not yet found (preserves rrule.before and horizon fallbacks).
  - Treat Weekday.n=0 as “no ordinal”; prefer bysetpos when present so MONTHLY bysetpos+byweekday (e.g., “3rd Tuesday”) matches correctly.

--------------------------------------------------------------------------------

5) Module split (services-first; keep files short)
[unchanged]

--------------------------------------------------------------------------------

6) Validation & constraints
[unchanged]

--------------------------------------------------------------------------------

7) Tests (status)

- Odd-months scenario: PASS.
- Every‑2‑months scenario:
  - Revalidated assertions and aligned dtstart to the first actual occurrence (2021‑01‑19 05:00 America/Chicago) so interval stepping is well-defined.
  - Expected outcomes (May 18 active; July 16 blackout; July 20 active) remain unchanged.

--------------------------------------------------------------------------------

8) Long-file scan (source files > ~300 LOC)
[unchanged]

--------------------------------------------------------------------------------

9) Next steps (implementation plan)

- Re-run tests; both Chicago scenarios should pass across environments.
- If any residual drift appears, add narrow normalization (e.g., widen same-day window slightly) with rationale, avoiding heavy dependencies.

