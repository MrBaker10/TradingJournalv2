# Spec: Weekly review

Status: ready-for-agent

Roadmap: `context/project-overview.md` → Phase 3, item 5. Terms: `GLOSSARY.md`.

## Problem Statement

The daily pre-market plan and end-of-day review capture single days, but patterns — the
same mistake three days in a row, a session that keeps going wrong, hesitation that
produced missed setups — only show across a week. There is no place to step back once a
week, look at the week's process numbers and write down what to change.

## Solution

A weekly review per review week (Sunday to Friday in the user's timezone). It has three
free-text fields — what worked, what did not, focus for next week — beside a read-only
summary of that week over all real accounts: logged days, the by-the-book share, the top
three mistakes, the number of missed setups and Net P&L as a neutral money figure. The
user can open the current week or any past week, write and save explicitly, and come back
to edit. The weekly review is a habit of its own and does not change the consistency
score.

## User Stories

1. As a trader, I want a weekly review for the current review week, so that I can reflect at the end of my trading week.
2. As a trader, I want the review week to run Sunday to Friday in my timezone, so that the Sunday Globex open belongs to the week it starts.
3. As a trader, I want a field "what worked", so that I keep what is good.
4. As a trader, I want a field "what did not work", so that I name the problem.
5. As a trader, I want a field "focus next week", so that I leave with one intention.
6. As a trader, I want to save explicitly and see that it saved, so that I never lose a review.
7. As a trader, I want to edit a saved review later, so that I can add a thought.
8. As a trader, I want to open past weeks and write a review late, so that a missed week can still be caught up.
9. As a trader, I want to step to the previous and next week, so that I can read my reviews in sequence.
10. As a trader, I want not to step beyond the current week, so that I never write a review for a week that has not happened.
11. As a trader, I want the week's logged days shown, so that I see how often I showed up.
12. As a trader, I want the week's by-the-book share shown, so that I see how disciplined I was.
13. As a trader, I want the week's top three mistakes with their counts, so that I know what to work on.
14. As a trader, I want the week's missed setups counted, so that hesitation is visible.
15. As a trader, I want the week's Net P&L as a neutral money figure in my display currency, so that I see the result without it being the point.
16. As a trader, I want the summary to cover all my real accounts, never practice accounts, so that it matches my combined figures.
17. As a copy trader, I want Net P&L counted per real account and counts counted once, so that the summary follows the same rules as the dashboard.
18. As a trader, I want the summary to stay read-only and always computed from my trades, so that editing a trade updates past summaries.
19. As a trader, I want a review independent of the account selector, so that one review covers my whole week.
20. As a trader, I want an indication of which past weeks already have a review, so that I can spot gaps.
21. As a trader, I want the weekly review to leave my consistency score unchanged, so that past months stay comparable.
22. As a trader, I want a calm empty state for a week without trades, so that a review is still possible after a week off.
23. As a user, I want my reviews visible only to me, and deleted with my user, so that they stay private.

## Implementation Decisions

- **Schema (generated migration):** `weekly_reviews` with user (cascade on user deletion),
  week start (`date`, always the Sunday of the review week), three nullable text fields,
  created/updated timestamps; unique on user and week start so saving is an upsert, like
  `daily_notes`.
- **Domain (pure):** review-week arithmetic — the week start for a date and the date range
  of a week, Sunday to Friday, in the user's timezone; whether a week is current, past or
  future. Lives beside the existing time helpers and reuses the streak's notion of trading
  day (Sunday opens the week).
- **Query module `weekly-reviews`:** get and upsert by user and week start; list week
  starts that have a review in a range; the week summary in SQL — logged days, by-the-book
  share, top three mistakes, missed setups count, Net P&L — scoped to all real accounts
  with the existing scope helpers (practice excluded, money multiplied once by real
  account count, counts not multiplied), in the "All accounts" display currency.
- **Actions:** save via server action with `getCurrentUser()` and a Zod schema; refuses a
  week start that is not a Sunday or lies in the future.
- **UI:** a page reachable from Progress (no new navigation item), with week stepping via
  a search parameter, explicit save, the summary beside the fields. Money in the neutral
  semantic colour, no glow. `context/Design.md` section first.
- No effect on consistency score, streak or badges in this spec.

## Testing Decisions

- A good test reads and writes through the query module's public functions against real
  Postgres and asserts what the review page would show.
- **Seam: the `weekly-reviews` query module** (prior art: `daily-notes` queries,
  `dashboard.test.ts`, `user-deletion.test.ts`). Cases: upsert then read; a second save
  replaces, not duplicates; another user's review invisible; a Sunday trade belongs to
  the week it opens, a Saturday has no week effect; week boundaries in a non-UTC
  timezone; practice-only trades excluded from the summary; copy trade multiplies P&L by
  real accounts only, counts once; missed setups counted, never in P&L; top three mistakes
  ordered by count; user deletion removes reviews.
- Domain week arithmetic covered by Vitest unit tests (DST transition weeks included).
- DB tests must execute, not skip; full gate plus browser click path (write, save, step
  back, edit past week, future week refused).

## Out of Scope

- Any change to the consistency score weights or inputs.
- A weekly-review badge (to be decided separately).
- Reminders or notifications.
- Per-account reviews, templates, or extra fields.
- Monthly or quarterly reviews.

## Further Notes

- Confirmed 2026-10-18: the page lives under Progress rather than as a ninth navigation item,
  because it is a habit like the streak and score shown there; moving it is a routing
  change only.
