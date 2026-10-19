# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Ledger, ticket 01 (`feature/ledger`).

## Feature: Ledger — 01 Record and list entries without an account

- Goal: `/ledger` as the eighth nav item. The user records an expense (one fixed
  category) or a payout with date, USD amount (≥ 0) and optional note; the page lists
  entries newest first, with an empty state.
- Scope: new table `ledger_entries` (generated migration), pure domain
  module `src/domain/ledger.ts`, Zod schema, query module `ledger` (create, list), server
  action, page, form and list components, nav item, `Design.md` section, user-deletion
  test extended.
- Do not build: account picker or account column (ticket 02), totals and ledger net
  (03), filters (04), edit and delete (05); anything on dashboard, analytics, progress
  or the CSV export; recurring entries; currencies other than USD.
- Acceptance: `.scratch/ledger/issues/01-record-and-list-entries.md`; full gate from
  `ai-interaction.md` with DB tests executing; browser path empty state → expense →
  payout → both listed newest first.
- Open questions: none. Spec `.scratch/ledger/spec.md`.
