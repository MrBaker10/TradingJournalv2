# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress: save-trade** — Branch `feature/save-trade`, ticket 03

## Feature: save-trade

**Goal.** One module saves a trade, new or edited; the two server actions shrink to
adapters. Spec: `.scratch/save-trade/spec.md`, tickets under
`.scratch/save-trade/issues/`.

**Scope (ticket 03).** `saveTrade` in `src/lib/trades/save.ts` edits when given a
`tradeId` option: owned-trade lookup ("Trade not found"), the archive rule (an
archived account the trade already sits on stays, another one is dropped), tags and
accounts replaced, stored commissions kept unless instrument or contracts changed,
none from a rate while the P&L is an import file's own, import marks after the edit.
Links stay with their own actions. `updateTrade` keeps parsing, the user lookup,
badges and refresh (journal, the trade, dashboard). The module's helpers are no
longer exported.

### Do not build

- No change to the form, a figure or an error message.
- The form's "by the book" default: own ticket,
  `.scratch/fix-by-the-book-default/issues/01-untouched-by-the-book-stays-empty.md`.
- Everything under the spec's "Out of Scope".

### Acceptance

- [x] `saveTrade` takes an optional trade id; `updateTrade` keeps only parsing, the
      user lookup, badges and refresh.
- [x] DB tests for every case the ticket lists.
- [x] Lint, typecheck, full tests (DB tests executed), build.
- [x] Browser: edit a trade's prices and see the new P&L; untick a tag and see it
      gone; save an imported trade unchanged (see Verification).

### Verification

`pnpm exec vitest run src/lib/trades/__tests__/save.test.ts`: 19 DB tests, green.
The not-found test was red before the edit path existed; the other five edit tests
describe moved behaviour, and five mutations each turned exactly their test red
(create's archive rule on edit, marks not written, basis never changed, P&L never
from a file, confluences not deleted on replace). Gates: lint, typecheck, 1244 tests
in 75 files (none skipped), build. Browser on the dev server: test trade 74929 (MES,
2020-01-06, Sim (test), tag NYO) logged at +$100.00 / +2.00R, edited to exit 5020
with NYO unticked: detail shows +$200.00 / +4.00R and no confluences, DB has 0 tags
and 1 account. Imported trade 14660 saved unchanged: its batch went from "Remove 59
of 59" to "58 of 59" because the form submits `byTheBook: false` for an empty value
(same on `main`, own fix ticket); `by_the_book` was reset to null and the batch shows
59 of 59 again. No console errors.

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
