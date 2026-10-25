# 02: Tick off the daily checklist on the dashboard

**What to build:** A daily checklist card beside the plan card on the dashboard. It
shows today's copy of the checklist template with all three phases, a per-phase count
and the process glow for a completed phase. Ticking and unticking save immediately.
Only ticked steps are recorded per day, with their text and phase copied at tick time.
Today is the user's calendar day in `users.timezone`, resolved on the server as for the
pre-market plan.

**Blocked by:** 01 (Manage the checklist template in Settings).

Status: ready-for-agent

## Acceptance

- [ ] Without a template, the dashboard shows an empty state linking to Settings.
- [ ] With a template, the card shows all three phases with "done/total" counts; a
      completed phase carries the Design.md process glow. No toast, animation or
      celebration on completion.
- [ ] Each step is an accessible checkbox labelled by its text. Ticking is optimistic,
      rolls back on failure and shows an inline error in the card.
- [ ] Tick and untick, reload, and verify ticks persist. The client never supplies a
      date; a new day starts unticked.
- [ ] A step added in Settings appears unticked today. Renaming a ticked step keeps
      today's tick. Deleting a ticked step removes it and today's check, while checks
      on earlier dates remain with their copied text and phase.
- [ ] Switching the account filter leaves the checklist unchanged. Streak, consistency
      score and badges are unaffected by ticking.
- [ ] Ticking verifies item ownership; another user's item IDs cannot be ticked or
      read. Deleting a user deletes their checks.
- [ ] Real Postgres tests through the query module cover today's read, tick/untick,
      new item, rename, delete with earlier checks kept, a new date, ownership and
      cascade.
- [ ] Run the required project verification gate. In the browser, tick and untick on
      the dashboard, including the empty state, phone width and keyboard use, and
      inspect the console for new errors. Record commands and results.

## Do not build

- A view of past days or any adherence statistics.
- Any effect on streak, consistency score or badges.
- Time- or session-based showing or hiding of phases, reminders or notifications.
- Reordering; this belongs to ticket 03.
- New dependencies or unrelated refactors.
