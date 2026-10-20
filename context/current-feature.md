# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress:** weekly-review, ticket 01 (`.scratch/weekly-review/issues/01-write-current-week-review.md`).
Branch `feature/weekly-review`.

## Feature: Weekly review

- Goal: the user writes and saves a weekly review for the current review week, reached
  from Progress (spec `.scratch/weekly-review/spec.md`).
- Scope: table `weekly_reviews` with generated migration; pure review-week arithmetic in
  `src/domain/review-week.ts`; query module and server action `weekly-reviews`; page
  `/progress/weekly-review` and an entry card on Progress; Design.md §4.26.
- Do not build: week stepping and past weeks (ticket 02), week summary (03), Net P&L
  (04), any effect on consistency score, streak or badges, a badge, reminders,
  per-account reviews, templates or extra fields, monthly or quarterly reviews.
- Acceptance: the checklist in ticket 01; gates from `ai-interaction.md`; DB tests
  executed; browser click path from Progress through save, reload and edit.
- Open questions:
  - `coding-standards.md` → Error handling says user-facing errors surface as a Sonner
    toast; Design.md §4.6 and §4.26 put a save error under the button. The weekly review
    follows the plan card (under the button). Which rule wins?

<!--
For each new task, record:
- Goal: the intended result.
- Scope: affected modules/files and any schema or domain changes.
- Do not build: concrete exclusions for this task.
- Acceptance: observable results and applicable verification from ai-interaction.md.
- Open questions: unresolved requirements; never invent product decisions.
-->
