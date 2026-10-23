# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress: fx-range-edges** — Branch `fix/fx-range-edges`

## Fix: fx-range-edges

**Goal.** Close the two gaps the review of `87fd345` (fx-fetch-coverage) found at the
edges of a fetched range:
1. A date at a range's start counts as settled while its rate comes from before the
   range: a range starting on a Saturday settles that Saturday on Wednesday's rate
   although Thursday and Friday were never fetched.
2. A weekend or holiday at the end of a fetch is never settled, because a range ends
   at the last rate returned; that day is fetched again on every call.

**Scope.** `datesNeedingFetch` in `src/domain/fx.ts` settles a date only when one
fetched range covers the stretch from its applicable rate to the date.
`ensureFxRates` in `src/db/queries/fx.ts` fetches up to the last date plus
`MAX_RATE_LOOKBACK_DAYS` (like `windowTo`); the range still ends at the last rate
returned, so a past Saturday is settled once Monday's rate comes back — the same rule
`finalRateFor` uses. Repro tests in `src/db/queries/__tests__/fx.test.ts`, domain
tests in `src/domain/__tests__/fx.test.ts`. Decided 2026-10-23 (variant a).

### Do not build

- No clock or timezone in `ensureFxRates`; no change to `rateFor`, the seven-day
  lookback, display-currency or import rules.
- No schema change, no backfill or merging of stored ranges.
- No UI change.

### Acceptance

- [x] Repro tests red before, green after: a range-start Saturday gets Friday's rate;
      a past Saturday is fetched once.
- [x] Existing fx tests pass; only the expected fetch `to` changes where the window
      now reaches past the last date.
- [x] Lint, typecheck, full tests (DB tests executed), build.
- [x] Browser: not applicable — no screen changes; behaviour covered at the query seam.

### Verification

Repro (`pnpm exec vitest run src/db/queries/__tests__/fx.test.ts -t "ensureFxRates"`)
went red twice on the unfixed code: Saturday 2001-03-10 received Wednesday's rate
(`0.907` instead of `0.909`) without a fetch, and a past Saturday was fetched twice.
Cause 1: `datesNeedingFetch` checked that the date lay in a range, not the stretch from
its applicable rate. Cause 2: a range ends at the last rate returned and the fetch
ended at the last date, so a weekend at the end never lay inside a range.
Because the fetch now reaches past the last date, three existing scenarios no longer
left a gap and were rebuilt with wider spacing (same rule, new dates); "fetches again
for a date past the last stored rate" now models an unpublished Monday through the
fetcher instead of deleting stored rates, which a range would contradict. With only
the domain fix reverted, the range-start test fails (`0.914` instead of `0.916`); with
both reverted, the Saturday and fetch-window tests fail. frankfurter answers a future
`to` with HTTP 200 and the published rates only (checked 2026-10-23).
Gates: lint, typecheck, 1228 tests in 74 files (none skipped), build.

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
