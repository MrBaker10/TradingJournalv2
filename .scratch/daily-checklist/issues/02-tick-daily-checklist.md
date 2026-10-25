# 02: Tick off the daily checklist on the dashboard

**What to build:** A daily checklist card beside the plan card on the dashboard. It
shows today's copy of the checklist template with all three phases, a per-phase count
and the process glow for a completed phase. Ticking and unticking save immediately.
Only ticked steps are recorded per day, with their text and phase copied at tick time.
Today is the user's calendar day in `users.timezone`, resolved on the server as for the
pre-market plan.

**Blocked by:** 01 (Manage the checklist template in Settings).

Status: done

## Acceptance

- [x] Without a template, the dashboard shows an empty state linking to Settings.
- [x] With a template, the card shows all three phases with "done/total" counts; a
      completed phase carries the Design.md process glow. No toast, animation or
      celebration on completion.
- [x] Each step is an accessible checkbox labelled by its text. Ticking is optimistic,
      rolls back on failure and shows an inline error in the card.
- [x] Tick and untick, reload, and verify ticks persist. The client never supplies a
      date; a new day starts unticked.
- [x] A step added in Settings appears unticked today. Renaming a ticked step keeps
      today's tick. Deleting a ticked step removes it and today's check, while checks
      on earlier dates remain with their copied text and phase.
- [x] Switching the account filter leaves the checklist unchanged. Streak, consistency
      score and badges are unaffected by ticking.
- [x] Ticking verifies item ownership; another user's item IDs cannot be ticked or
      read. Deleting a user deletes their checks.
- [x] Real Postgres tests through the query module cover today's read, tick/untick,
      new item, rename, delete with earlier checks kept, a new date, ownership and
      cascade.
- [x] Run the required project verification gate. In the browser, tick and untick on
      the dashboard, including the empty state, phone width and keyboard use, and
      inspect the console for new errors. Record commands and results.

## Do not build

- A view of past days or any adherence statistics.
- Any effect on streak, consistency score or badges.
- Time- or session-based showing or hiding of phases, reminders or notifications.
- Reordering; this belongs to ticket 03.
- New dependencies or unrelated refactors.

## Implementation — 2026-10-25

Added the user-owned `daily_checklist_checks` table (generated migration 0031):
calendar date, nullable item reference (`set null`), phase and text copied at tick
time, unique per user, date and item, cascading on user deletion. The query module
reads today's checklist as the template left-joined with today's checks, ticks or
unticks an owned item and lists one date's recorded checks (`listChecklistChecks`,
used by the tests to prove kept history; no past-day view is built). Deleting an item now also removes today's check; earlier
checks keep their copied text and phase. Tick and delete lock the item row first, so
they serialize. The action `setChecklistStepChecked` resolves today with
`todayInTimeZone(user.timezone)`; the client only sends `{ itemId, checked }`.
Dashboard: per the user's layout decision, the PnL calendar takes a full-width row
and the plan card and daily checklist card sit side by side below it. The card shows
three phases, "done/total" counts (screen-reader text "n of m done"), `text-glow` on
a completed phase's count, an optimistic tick via `useOptimistic`, and an inline error.

### Verification

- TDD: daily read/tick test failed on the missing functions; the template-change test
  failed on the old delete signature; the tick-schema test failed on the missing
  schema. All passed after implementation. The ownership and cascade tests passed on
  the first run because the earlier slices already enforced both.
- `pnpm db:generate` (0031) and `pnpm db:migrate` passed.
- `pnpm test src/db/queries/__tests__/checklist.test.ts src/schemas/__tests__/checklist.test.ts`:
  17 passed against real Postgres, no skips. After switching the history and cascade
  assertions to `listChecklistChecks`, the query tests failed on the missing function,
  then passed (13).
- Final ordered gate after the review fixes and `listChecklistChecks`: `pnpm lint` passed (390 files),
  `pnpm typecheck` passed, `pnpm test` passed (79 files, 1331 tests, no skips),
  `pnpm build` passed (exit 0, checked with pipefail).
- Browser (`pnpm dev`, localhost:3000): the dashboard without a template showed the
  empty state, and its link opened Settings. Added synthetic QA steps. The checkboxes
  are labelled by their step text, with 40px targets. Ticked via Tab/Space (cyan focus
  ring visible) and by mouse. Pre-market 2/2 showed the glowing count without toast or
  animation. Reload kept the ticks; unticking and reloading kept 1/2. In a second tab,
  renamed a ticked step (tick kept after reload), added a review step (unticked) and
  deleted a ticked step. Unticking that step on the stale dashboard rolled back and
  showed "This step no longer exists." in the card. After reload, the deleted step was
  gone. Switching the account filter to All accounts left the checklist unchanged;
  restored to the original account. Streak, consistency and badge tiles were identical
  before and after a tick. At 390 × 844 (iframe method), the card stacks below the plan
  card with no overflow (343px client/scroll width) and tick/untick works. Console: no
  errors or warnings. The synthetic steps and their checks were deleted afterwards and
  the empty state returned.

## Review

Baseline: HEAD `56d43bb` plus the untracked files. Two independent axes via the
code-review skill.

- Standards P2: tick could race a delete (FK error, or today's check left with a
  cleared reference). Fixed: both lock the item row in a transaction.
- Standards P3: duplicated check predicate extracted to `checkOf`; action renamed
  from `tickChecklistStep` to `setChecklistStepChecked`.
- Standards/Spec P3: the tick action revalidated only the dashboard. Fixed: it now
  uses `revalidateChecklist()` (dashboard and settings).
- Spec P3: the count read only as "3/5" to screen readers. Fixed with sr-only text.
- Standards P2: the tests read `daily_checklist_checks` directly, against "avoid
  assertions on table layout". The user rejected this; fixed with
  `listChecklistChecks` in the query module.
- Standards/Spec: Design.md had no checklist section. Added §4.29 and the §1 table
  entry with the user's approval of the wording.
- Accepted: the PnL calendar layout change was the user's decision. A tick from a
  page left open past midnight lands on the new day, as "only today can be ticked"
  requires.
- Checkpoint approved by the user with explicit commit authorization.
