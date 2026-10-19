# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Prop firm link, ticket 02 (`feature/prop-firm-link`).

## Feature: Prop firm link — 02 Rule status in settings

- Goal: for a linked account, settings show the current attempt's rule status: progress
  to the profit target (neutral), distance to a static drawdown floor (ok, close, breached)
  and trading days done versus the minimum. Unset rules read "Not set"; rules of later
  tickets read "Pending".
- Scope: one-statement attempt day-series query in `src/db/queries/account-rules.ts`,
  new pure domain module `src/domain/rule-status.ts`, rule status panel in the account
  row in settings, `Design.md` paragraph.
- Do not build: EOD trailing and intraday trailing (03), daily loss and consistency (04),
  resets and payouts (05), the dashboard card (06); notifications, score effects.
- Acceptance: `.scratch/prop-firm-link/issues/02-rule-status-in-settings.md`; full gate
  with DB tests executing; browser: settings for a linked account shows the three rules.
- Decided 2026-10-19: a Saturday-dated trade rolls onto Monday like a Sunday one in the
  rule day series, so no P&L drops out of the balance.
- Open questions: none. Spec `.scratch/prop-firm-link/spec.md`.
