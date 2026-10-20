# 01: Write and save the weekly review for the current review week

**What to build:** From Progress, the user opens the weekly review of the current review
week (Sunday to Friday; `users.timezone` decides which date is today, trades fall into a
week by their trade date). The page shows three free-text fields — what worked, what did
not work, focus next week — and saves explicitly with a visible confirmation. Reopening
the page shows the saved review, which can be edited and saved again. No new navigation
item; the review ignores the account selector.

Spec: `.scratch/weekly-review/spec.md`. Terms: `GLOSSARY.md` → Review week, Weekly review.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Generated migration adds `weekly_reviews`: user (cascade on user deletion), week start as `date`, three nullable text fields, created/updated timestamps, unique on user and week start.
- [ ] Pure domain week arithmetic: week start for a date (Sunday opens the week, Saturday belongs to no review week's trading days), the week's date range, and whether a week is current, past or future relative to today in the user's timezone.
- [ ] Vitest covers the week arithmetic, including DST transition weeks and a non-UTC timezone where today differs from the UTC date.
- [ ] Query module `weekly-reviews` with get and upsert by user and week start; save goes through a server action with `getCurrentUser()` and a Zod schema.
- [ ] DB tests (executed): upsert then read; a second save replaces, not duplicates; another user's review invisible; user deletion removes reviews.
- [ ] Progress links to the page; layout follows the relevant `context/Design.md` section.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: open from Progress, write, save, see confirmation, reload, edit; no new console errors.
