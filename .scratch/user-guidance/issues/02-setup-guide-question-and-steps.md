# 02: Setup guide — question and step list

**What to build:** The first path through every layer of the setup guide. On the
dashboard, a card at the top asks "Want a short setup guide?" with "Yes, show me" and
"No, I'll find my way". "No" hides the card for good (until ticket 03's Settings
switch). "Yes" shows five steps in order — add an account, link a prop firm, create a
trading strategy, set up a checklist template, log a first trade or missed setup —
each linking to its page, marked required or optional, and ticked once its data
exists. Existing users with an account and a logged entry, and the demo user, never
see the card.

This ticket introduces the setup guide state on the user (`undecided`, `declined`,
`active`, `dismissed`, `completed`; generated migration, no backfill), the pure domain
function that maps state and facts to what is shown, and the query module that reads
the facts in SQL and writes the state. Hiding, the Settings switch and completion
follow in tickets 03 and 04; until 04 lands, an `active` guide with both required steps
done simply shows all steps ticked.

**Blocked by:** None (can start immediately).

Status: ready-for-agent

## Acceptance

- [ ] A newly registered user sees the question card at the top of the dashboard; it
      stays after a reload until answered.
- [ ] "No" writes `declined` and the card is gone, also after reload and on another
      browser.
- [ ] "Yes" writes `active` and shows the five steps with links to Settings →
      Accounts, Prop firms, Strategies, Settings → Checklist and Journal → New.
- [ ] Ticks are derived: an active account (practice counts, archived does not), an
      account linked to a prop firm program, a trading strategy, a checklist template
      with a step, a trade (taken or missed, manual or imported).
- [ ] A user with an active account and a trade in state `undecided` sees no card; the
      demo user sees no card in any state.
- [ ] Writes resolve the user with `getCurrentUser()` and refuse the demo user.
- [ ] Vitest table for the domain function covers every rule listed in the spec.
- [ ] Real Postgres tests through the query module cover each fact, the Yes/No
      transitions, cross-user isolation and cascade on user deletion; none skipped.
- [ ] Design.md gains a short pattern for the setup guide card; the card follows it in
      both themes and at phone width, with keyboard use; no new console errors.
