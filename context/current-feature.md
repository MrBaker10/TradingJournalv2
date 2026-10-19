# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Prop firm link, ticket 03 (`feature/prop-firm-link`).

## Feature: Prop firm link — 03 EOD trailing drawdown; intraday not checkable

- Goal: the rule status shows an EOD trailing floor (highest end-of-day balance minus
  the amount, rising only on new end-of-day highs, capped at the lock level) with the
  same ok/close/breached thresholds as the static floor; an intraday trailing drawdown
  reads "Not checkable" with no floor.
- Scope: `src/domain/rule-status.ts` and its Vitest suite, the rule status panel in
  settings, `Design.md` rule status paragraph.
- Do not build: daily loss and consistency (04), resets and payouts (05), the dashboard
  card (06); intraday trailing computation.
- Acceptance: `.scratch/prop-firm-link/issues/03-eod-trailing-drawdown.md`; full gate;
  browser: settings for an EOD trailing and an intraday trailing link.
- Open questions: none. Spec `.scratch/prop-firm-link/spec.md`.
