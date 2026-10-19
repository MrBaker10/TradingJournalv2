# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Ledger, ticket 02 (`feature/ledger`).

## Feature: Ledger — 02 Tie an entry to a real account

- Goal: an entry can be tied to one of the user's real, non-archived accounts or to
  none; the list shows the account (archived ones keep their name); an account with
  ledger entries cannot be hard-deleted.
- Scope: ledger query module (account check on create, account name in the list,
  pickable accounts), schema/action/form/list, account hard-delete moves into a query
  that refuses accounts with trades or ledger entries, `Design.md` §4.25 account column.
  No migration (column exists since ticket 01).
- Do not build: totals (03), filters (04), edit and delete of entries (05); nothing on
  dashboard, analytics, progress or the CSV export.
- Acceptance: `.scratch/ledger/issues/02-tie-entry-to-account.md`; full gate with DB
  tests executing; browser path from the ticket.
- Open questions: none. Spec `.scratch/ledger/spec.md`.
