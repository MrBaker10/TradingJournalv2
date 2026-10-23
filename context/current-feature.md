# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress: save-trade** — Branch `feature/save-trade`, ticket 02

## Feature: save-trade

**Goal.** One module saves a trade, new or edited; the two server actions shrink to
adapters. Spec: `.scratch/save-trade/spec.md`, tickets under
`.scratch/save-trade/issues/`.

**Scope (ticket 02).** `saveTrade` in `src/lib/trades/save.ts` (new, no `next/*`)
saves a new trade: instrument and tag checks, active owned accounts only, assignment
validation, columns and P&L with the trade date's profit-currency rate, each account's
commission, the write with relations and links in one transaction, display rates of
foreign-currency accounts (best effort). Rate fetcher and executor are options with
the ECB and the shared client as defaults. `createTrade` keeps parsing, the user
lookup, badges and refresh. The shared helpers move into the module; `updateTrade`
imports them until ticket 03. DB tests in `src/lib/trades/__tests__/save.test.ts`.

### Do not build

- No edit path through the module (ticket 03); no change to the form, a figure or
  an error message.
- Everything under the spec's "Out of Scope".

### Acceptance

- [x] Save module outside the pure domain, no `next/*` import.
- [x] Create action keeps only parsing, the user lookup, badges and refresh.
- [x] Error messages word for word today's.
- [x] DB tests for every case the ticket lists.
- [x] Lint, typecheck, full tests (DB tests executed), build.
- [x] Browser: a taken trade, a missed setup and a copy trade with a typed commission
      appear in the journal with the expected amounts.

### Verification

`pnpm exec vitest run src/lib/trades/__tests__/save.test.ts`: 13 DB tests, green.
They describe behaviour that only moved, so they were green from the start; three
mutations proved they can fail (unchecked account ids: 3 red; typed commissions
ignored: 1 red; display rates not stored: 1 red). The rate-failure test asserts only
the save: the P&L falls back to the nearest stored rate, which depends on the local
table. Gates: lint, typecheck, 1238 tests in 75 files (none skipped), build. Browser on the running dev server, date
2020-01-06, test accounts only: a taken MES trade on Sim (test) shows +$100.00 and
+2.00R behind the practice reveal; a missed setup shows without P&L; a copy trade on
FTMO Test Account and the Apex design-test account with $3.70 typed on Apex shows
+$196.30 and +2.00R. No console errors.

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
