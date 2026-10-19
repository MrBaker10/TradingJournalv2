# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Prop firm link, ticket 05 (`feature/prop-firm-link`).

## Feature: Prop firm link — 05 Resets and payouts shape the attempt

- Goal: a reset expense on a linked account starts a new attempt from its date (also at
  $0); payouts on the account inside the attempt lower the balance from their date for
  every balance-based rule, without counting as trading P&L or a trading day.
- Scope: `getAttempt` (one statement: attempt start, day series, payouts by day) in
  `src/db/queries/account-rules.ts`, `src/domain/rule-status.ts`, settings page and
  rule status panel header, `Design.md` rule status paragraph.
- Do not build: the dashboard card (06); payout eligibility, scaling plans; ledger
  changes.
- Acceptance: `.scratch/prop-firm-link/issues/05-resets-and-payouts.md`; full gate with
  DB tests executing; browser: a reset moves the attempt, a payout lowers the balance.
- Open questions: none. Spec `.scratch/prop-firm-link/spec.md`.
