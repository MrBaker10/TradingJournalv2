# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Prop firm link, ticket 06 (`feature/prop-firm-link`).

## Feature: Prop firm link — 06 Dashboard "Rule status" card

- Goal: with exactly one linked account selected, the dashboard shows a "Rule status"
  card with the same rules and figures as the account's settings; hidden for "All
  accounts" and for an unlinked account. No notification, badge, score effect or
  celebration.
- Scope: `getAccountRules` (one account's link, user-filtered) in
  `src/db/queries/account-rules.ts`, a shared loader in `src/lib/prop-firms/`, the rule
  lines shared by settings and the new dashboard card, `Design.md`.
- Do not build: rule status for "All accounts"; notifications; changes to the rules.
- Acceptance: `.scratch/prop-firm-link/issues/06-dashboard-rule-status-card.md`; full
  gate; browser: card with one linked account selected, hidden for "All accounts".
- Open questions: none. Spec `.scratch/prop-firm-link/spec.md`.
