# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Ledger, ticket 04 (`feature/ledger`).

## Feature: Ledger — 04 Filter by account and date range

- Goal: the ledger page has its own account filter and a date range on the entry date;
  list and totals follow the same filter, so the totals always match the visible list.
  Without an account filter, entries without an account are listed and counted.
- Scope: one filter condition in the ledger query module shared by list and totals,
  the accounts the filter offers (real ones, archived ones only with entries), the
  filter value checked server-side, a filter bar on `/ledger` mirrored into
  searchParams, `Design.md` §4.25 filter. No migration.
- Do not build: edit and delete (05), practice toggle lock (06), a "No account" filter
  option, date presets; nothing on dashboard, analytics, progress or the CSV export.
- Acceptance: `.scratch/ledger/issues/04-filter-by-account-and-date.md`; full gate with
  DB tests executing; browser path from the ticket.
- Open questions: none. Spec `.scratch/ledger/spec.md`.
