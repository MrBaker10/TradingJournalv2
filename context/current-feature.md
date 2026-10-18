# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress: fx-fetch-coverage** — Branch `fix/fx-fetch-coverage`

## Fix: fx-fetch-coverage

**Goal.** A date counts as settled only inside a range that was actually fetched.
Today any later stored rate settles a date, so a day between two separate fetches
borrows a rate up to seven days old — for an import's conversion and for display.
Decided 2026-10-18 (Phase 3, item 1): record fetched ranges.

**Scope.** New table of fetched ranges per currency (generated migration);
`datesNeedingFetch` in `src/domain/fx.ts` reads ranges instead of "a later rate
exists"; `ensureFxRates` records the range each fetch covered (window start to the
last rate it returned) and reads ranges for the window. Regression test in
`src/db/queries/__tests__/fx.test.ts`, domain tests adapted to the new input.
No backfill: existing rates have no ranges, so each date is fetched once more (upsert,
harmless) and the nightly `job:fx` corrects imports converted on a gap rate.

### Do not build

- No change to `rateFor`, the seven-day lookback, display-currency or import rules.
- No backfill guessing ranges from existing rates (that guess is the bug).
- No UI change.

### Acceptance

- [x] Regression test red before, green after: a date between two fetches gets its own rate.
- [x] Existing fx query and domain tests pass, assertions unchanged in meaning.
- [x] Lint, typecheck, full tests (DB tests executed), build.
- [x] Browser: not applicable — no screen changes; behaviour covered at the query seam.

### Verification

Repro (`pnpm exec vitest run src/db/queries/__tests__/fx.test.ts -t "between two
separate fetches"`) went red twice on the unfixed code: 2001-03-08 received
2001-03-05's rate (`0.905` instead of `0.908`) without a fetch. Cause: a later stored
rate was taken as proof that the days before it had been fetched. Green after the fix.
Migration `0023` generated and applied locally. Gates: lint, typecheck, 1007 tests in
58 suites (none skipped), build.

### Open questions

None.

<!--
For each new task, record:
- Goal: the intended result.
- Scope: affected modules/files and any schema or domain changes.
- Do not build: concrete exclusions for this task.
- Acceptance: observable results and applicable verification from ai-interaction.md.
- Open questions: unresolved requirements; never invent product decisions.
-->
