# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Prop firm link, ticket 04 (`feature/prop-firm-link`).

## Feature: Prop firm link — 04 Daily loss limit and consistency rule

- Goal: the rule status shows today's net against the daily loss limit with the distance
  left, and the best day against total profit and the consistency limit, each ok, close
  or breached; consistency is skipped while total profit is zero or negative.
- Scope: `src/domain/rule-status.ts` and its Vitest suite, the rule status panel in
  settings, `Design.md` rule status paragraph.
- Do not build: resets and payouts (05), the dashboard card (06); notifications.
- Acceptance: `.scratch/prop-firm-link/issues/04-daily-loss-and-consistency.md`; full
  gate; browser: settings detail shows both rules.
- Open questions: none. Spec `.scratch/prop-firm-link/spec.md`.
