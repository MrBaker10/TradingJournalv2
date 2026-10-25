# Daily checklist

Status: done

## Problem Statement

Traders follow a daily routine: steps before the session opens, steps while trading
and steps when looking back at the day. The journal holds a free-text pre-market plan
and an end-of-day review, but no way to tick off the recurring steps of that routine.
Writing the same steps into the plan every day is tedious, and a text note does not
show at a glance which steps are still open.

## Solution

Let each user maintain one checklist template in Settings: routine steps grouped into
three fixed phases — pre-market, trading and day review. Every day the dashboard shows
that day's daily checklist in its own card beside the plan card, where steps are ticked
off by hand. The checklist is self-steering only: it feeds neither streak, consistency
score nor badges, is independent of trading strategies and accounts, and complements the
pre-market plan and end-of-day review rather than replacing them.

## User Stories

1. As a trader, I want to define my routine steps once, so that I do not rewrite them every day.
2. As a trader, I want my steps grouped into pre-market, trading and day review, so that the list mirrors my trading day.
3. As a trader, I want to add a step to a phase, so that my routine can grow.
4. As a trader, I want to rename a step, so that I can sharpen its wording.
5. As a trader, I want to delete a step, so that my routine stays current.
6. As a trader, I want to reorder steps within a phase, so that they follow the order I do them in.
7. As a trader, I want to edit my checklist template in Settings, so that daily use on the dashboard stays uncluttered.
8. As a trader, I want a clear message when a phase already holds the maximum number of steps, so that I know why I cannot add more.
9. As a trader, I want a clear message when a step's text is empty or too long, so that I can fix it at the field.
10. As a trader, I want today's daily checklist on the dashboard beside my pre-market plan, so that my routine sits where my day starts.
11. As a trader, I want to tick a step with one click, so that ticking is effortless.
12. As a trader, I want each tick saved immediately, so that I never need a save button and never lose a tick.
13. As a trader, I want to untick a step, so that a mis-click is easy to correct.
14. As a trader, I want all three phases visible all day, so that I can tick a step whenever I actually did it.
15. As a trader, I want a per-phase count such as "3/5", so that I see what is still open.
16. As a trader, I want a completed phase to show a subtle process highlight, so that finishing feels acknowledged without celebration.
17. As a trader, I want a new step added to the template to appear in today's list immediately, so that I can use it the same day.
18. As a trader, I want a renamed step to keep today's tick, so that wording changes do not undo my progress.
19. As a trader, I want a deleted step to disappear from today's list, so that today only shows my current routine.
20. As a trader, I want past days to keep what I ticked, so that changing the template never rewrites history.
21. As a trader, I want a fresh, unticked list each new day in my own timezone, so that every day starts clean.
22. As a trader, I want the daily checklist to belong to the same day as my pre-market plan, so that both always match.
23. As a trader without a template, I want an empty state on the dashboard that links to Settings, so that I know how to set up my routine.
24. As a trader, I want no prefilled example steps, so that I only ever tick my own routine.
25. As a trader, I want one checklist regardless of the selected account, so that switching the account filter does not change my routine.
26. As a trader, I want my checklist to have no effect on streak, consistency score or badges, so that progress keeps rewarding journaling only.
27. As a trader, I want my checklist kept private, so that nobody else can read or change it.
28. As a trader using a phone, I want to tick steps on the responsive dashboard, so that I can follow my routine away from my desk.
29. As a trader using a keyboard or screen reader, I want each step to be an accessible checkbox with its text as label, so that the list is usable without a mouse.
30. As a trader who deletes their user, I want the template and all daily checklists deleted with it, so that nothing remains.

## Implementation Decisions

- Reuse the installed stack, existing form controls, shared Zod validation and
  existing dashboard card and settings section patterns. No new dependency.
- Schema: two new user-owned tables, both cascading on user deletion.
  - Checklist template items: user, phase (`premarket` | `trading` | `review`), text,
    position within the phase.
  - Daily checklist checks: user, calendar date, nullable reference to the template
    item (set to null when the item is deleted), phase and text copied at tick time,
    tick timestamp. Unique per user, date and template item.
- Only ticked steps are recorded per day. Today's daily checklist is the current
  template joined with today's checks; past days keep only what was done, with the
  text and phase it had. A past day's total step count is not reconstructable; this
  is accepted because v1 shows no past days.
- Deleting a template item removes today's check for it; checks on earlier dates
  remain with the reference cleared. Renaming keeps the check. The copied text and
  phase are written when the step is ticked.
- The date is the user's calendar day in `users.timezone`, resolved on the server as
  for the pre-market plan; no Sunday roll. Clients never supply a date, and only
  today can be ticked.
- Limits: at most 20 items per phase, item text trimmed, 1–120 characters. Enforced
  server-side; the UI mirrors them.
- Reordering applies only within a phase. Moving a step to another phase is delete and
  re-add.
- A new query module owns template reads/writes, today's checklist read and tick
  toggling; all functions take the user ID and filter by it. Server actions resolve
  the user with `getCurrentUser()`, verify every supplied item ID belongs to that user,
  and revalidate the dashboard and settings.
- Dashboard: a separate card beside the plan card, rendered with all three phases,
  per-phase counts and the completed-phase process glow from Design.md; optimistic
  ticking with rollback and an inline error on failure. No toast, animation or
  celebration on completion. Empty template shows an empty state linking to Settings.
- Settings: a checklist template section with add, rename, delete and reorder per
  phase.
- The checklist reads no account scope and no practice flag. Streak, consistency
  score, badges and their inputs are unchanged.

## Testing Decisions

- Test externally observable behaviour through the new query module, the single test
  seam, against real Postgres in rolled-back transactions; avoid assertions on table
  layout or component internals.
- Prior art: `weekly-reviews.test.ts` and `strategies.test.ts` (fixture with two users
  in a rolled-back transaction).
- Cover: creating, renaming, deleting and reordering items per phase; the 20-item and
  120-character limits; today's read combining template and checks; tick and untick;
  a new item appearing unticked today; rename preserving today's check; delete
  removing today's check while keeping earlier checks with their copied text and
  phase; a new date starting unticked; rejection of cross-user reads, edits and ticks;
  cascade on user deletion.
- Validation schemas are tested where the existing schema tests do so.
- Browser checks cover Settings editing and dashboard ticking, including the empty
  state, phone width and keyboard use. Inspect new console errors during these flows.
- Follow the project's ordered verification gate. Relevant database tests must
  execute; skipped database cases are not passing evidence.

## Acceptance

1. With no template, open the dashboard and verify the empty state links to Settings.
2. In Settings, add steps to all three phases, rename one, reorder one phase and
   delete one step. Verify the 21st step in a phase and a 121-character text are
   rejected with a message at the field.
3. On the dashboard, tick and untick steps, reload, and verify ticks persist and the
   per-phase counts and completed-phase highlight are correct.
4. Add a step in Settings and verify it appears unticked today. Rename a ticked step
   and verify it stays ticked. Delete a ticked step and verify it disappears.
5. Switch the account filter and verify the checklist is unchanged. Verify streak,
   consistency score and badges are unaffected by ticking.
6. Sign in as another user and verify none of the first user's steps or ticks are
   visible.

## Out of Scope

### Do not build

- A view of past days' checklists or any adherence statistics.
- Any effect on streak, consistency score or badges.
- Links between checklist steps and trading strategies or trades.
- Reminders or notifications.
- Time- or session-based showing or hiding of phases.
- Example or preset templates.
- Multiple templates, e.g. per weekday or per account.
- A replacement for the pre-market plan or end-of-day review.
- The personal rulebook; it stays under Future in the project overview.

## Open Questions

None. Product behaviour, placement, data model and test seam were confirmed in
clarification rounds Q1–Q15 and the seam check.

## Further Notes

- Glossary terms: **Checklist template** and **Daily checklist** (`GLOSSARY.md`).
- No ADR: excluding the checklist from scoring follows the existing rulebook deferral
  and is cheap to revisit.
