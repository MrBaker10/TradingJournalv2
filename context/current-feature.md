# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** Prop firm link, ticket 01 (`feature/prop-firm-link`).

## Feature: Prop firm link — 01 Link a real account to a prop firm program

- Goal: in the account editor in settings, a real account can be linked to a prop firm
  program with the account rules the user bought (evaluation start, profit target, max
  drawdown with type and optional lock level, optional daily loss limit, consistency
  percentage and minimum trading days), the program's rule text beside each field.
  Saved together with the account; editable and removable.
- Scope: new table `account_rules` (generated migration), pure domain module
  `src/domain/account-rules.ts` (rule values and their validation), Zod schema, the
  account draft in `src/db/queries/account-editor.ts` writes or removes the link in the
  same transaction, settings page and account editor, `Design.md` paragraph.
- Do not build: rule evaluation, the attempt day-series query, rule status anywhere
  (tickets 02–04), resets and payouts (05), the dashboard card (06); parsing program
  text into numbers (ADR 0001); notifications, phase field, automatic archiving.
- Acceptance: `.scratch/prop-firm-link/issues/01-link-account-to-program.md`; full gate
  from `ai-interaction.md` with DB tests executing; browser path link → edit → remove,
  practice accounts cannot be linked.
- Open questions: none. Spec `.scratch/prop-firm-link/spec.md`.
