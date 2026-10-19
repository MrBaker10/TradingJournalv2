# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Ledger, ticket 06 (`feature/ledger`).

## Feature: Ledger — 06 Lock the practice toggle while ledger entries exist

- Goal: an account with ledger entries cannot be switched to practice; the editor
  disables the Practice toggle and says why, the server refuses the switch in the
  update statement like the currency lock.
- Scope: the lock in `saveAccountDraft`, the toggle lock and its note in the account
  editor, `Design.md` practice lock, the rule in `project-overview.md`. No migration.
- Do not build: nothing on dashboard, analytics, progress or the CSV export.
- Acceptance: `.scratch/ledger/issues/06-lock-practice-toggle.md`; full gate with DB
  tests executing; browser path from the ticket.
- Open questions: none (decided by Sascha 2026-10-19). Spec `.scratch/ledger/spec.md`.
