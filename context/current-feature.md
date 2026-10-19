# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Ledger, ticket 03 (`feature/ledger`).

## Feature: Ledger — 03 Totals and ledger net in the display currency

- Goal: the ledger page shows payouts, expenses and the ledger net above the form and
  list, in the "All accounts" display currency; outside USD each entry converts with
  its entry date's ECB rate, rounded per entry, then summed.
- Scope: `ledgerNetCents` in `src/domain/ledger.ts`, `getLedgerTotals` in the ledger
  query module (one SQL statement, filtered by user), a totals card on `/ledger` built
  from the §4.7 metric cell (`Design.md` §4.25). No migration.
- Do not build: filters (04), edit and delete (05), practice toggle lock (06); nothing on
  dashboard, analytics, progress or the CSV export.
- Acceptance: `.scratch/ledger/issues/03-totals-and-ledger-net.md`; full gate with DB
  tests executing; browser check in USD and EUR display currency.
- Open questions: none. Spec `.scratch/ledger/spec.md`.
