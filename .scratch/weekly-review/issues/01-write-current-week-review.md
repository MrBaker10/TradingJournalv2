# 01: Write and save the weekly review for the current review week

**What to build:** From Progress, the user opens the weekly review of the current review
week (Sunday to Friday; `users.timezone` decides which date is today, trades fall into a
week by their trade date). The page shows three free-text fields — what worked, what did
not work, focus next week — and saves explicitly with a visible confirmation. Reopening
the page shows the saved review, which can be edited and saved again. No new navigation
item; the review ignores the account selector.

Spec: `.scratch/weekly-review/spec.md`. Terms: `GLOSSARY.md` → Review week, Weekly review.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Generated migration adds `weekly_reviews`: user (cascade on user deletion), week start as `date`, three nullable text fields, created/updated timestamps, unique on user and week start.
- [x] Pure domain week arithmetic: week start for a date (Sunday opens the week, Saturday belongs to no review week's trading days), the week's date range, and whether a week is current, past or future relative to today in the user's timezone.
- [x] Vitest covers the week arithmetic, including DST transition weeks and a non-UTC timezone where today differs from the UTC date.
- [x] Query module `weekly-reviews` with get and upsert by user and week start; save goes through a server action with `getCurrentUser()` and a Zod schema.
- [x] DB tests (executed): upsert then read; a second save replaces, not duplicates; another user's review invisible; user deletion removes reviews.
- [x] Progress links to the page; layout follows the relevant `context/Design.md` section.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: open from Progress, write, save, see confirmation, reload, edit; no new console errors.

## Review

Two-axis review (standards, spec) against `0e0b361` on 2026-10-20, uncommitted tree.

Fixed:
- Rollover: the save action refused every week but the current one, so a review typed
  across the user's Saturday midnight was rejected and "reload" lost the text. The
  action now refuses only a future week (ticket 02's server rule, moved forward);
  separate messages for a future week and for a week start that is no Sunday.
- The action's `catch` now logs (`console.error`, like `ledger.ts`) before returning
  `success: false` (coding-standards.md, Error handling).
- Textareas carry `maxLength` from the schema's exported `MAX_REVIEW_FIELD_LENGTH`.

Left as is:
- `executor` parameters: used by the DB tests (`tx`), the `ledger.ts` pattern.
- `ReviewWeekPosition` past/current/future: the action tells future from the rest, and
  ticket 02 needs all three.
- `utcDay`, field class and save button copied from `streak.ts` / `plan-card.tsx`:
  existing pattern; extracting is out of scope for this ticket.
- `revalidatePath` only for the review page: `/progress` is dynamic and showed the new
  card state in the browser.
- Toast vs. message under the button: contradiction between coding-standards.md and
  Design.md recorded under Open questions in `context/current-feature.md`.
