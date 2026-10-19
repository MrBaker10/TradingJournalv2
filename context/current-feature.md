# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Ledger, ticket 05 (`feature/ledger`).

## Feature: Ledger — 05 Edit and delete entries

- Goal: the user edits an entry inline under its row with an explicit save, and deletes
  it with the two-click confirm; another user's entry can be neither changed nor
  deleted; an unchanged archived account stays on edit, a new or changed one must be
  real and active.
- Scope: update and delete in the ledger query module, Zod schema for update, server
  actions, the entry fields shared by an add and an edit form, two-click delete,
  `Design.md` §4.25 edit and delete. No migration. From the review (approved by Sascha):
  the two-click confirm becomes `src/hooks/use-two-click-confirm.ts`, used by the trade
  form, screenshot slots, archived accounts and the ledger.
- Do not build: practice toggle lock (06); nothing on dashboard, analytics, progress or
  the CSV export.
- Acceptance: `.scratch/ledger/issues/05-edit-and-delete-entries.md`; full gate with DB
  tests executing; browser path from the ticket.
- Open questions: none (inline edit decided by Sascha 2026-10-19). Spec
  `.scratch/ledger/spec.md`.
