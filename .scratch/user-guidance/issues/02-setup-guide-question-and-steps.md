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

Status: done

## Acceptance

- [x] A newly registered user sees the question card at the top of the dashboard; it
      stays after a reload until answered.
- [x] "No" writes `declined` and the card is gone, also after reload and on another
      browser.
- [x] "Yes" writes `active` and shows the five steps with links to Settings →
      Accounts, Prop firms, Strategies, Settings → Checklist and Journal → New.
- [x] Ticks are derived: an active account (practice counts, archived does not), an
      account linked to a prop firm program, a trading strategy, a checklist template
      with a step, a trade (taken or missed, manual or imported).
- [x] A user with an active account and a trade in state `undecided` sees no card; the
      demo user sees no card in any state.
- [x] Writes resolve the user with `getCurrentUser()` and refuse the demo user.
- [x] Vitest table for the domain function covers every rule listed in the spec.
- [x] Real Postgres tests through the query module cover each fact, the Yes/No
      transitions, cross-user isolation and cascade on user deletion; none skipped.
- [x] Design.md gains a short pattern for the setup guide card; the card follows it in
      both themes and at phone width, with keyboard use; no new console errors.

## Review

Baseline: HEAD `47c14af`. Two independent axes via the code-review skill.

- Standards: no hard violations. Fixed: the fact subqueries moved out of
  `getSetupGuide` into `factColumns` (function length); a missing user throws a plain
  `Error`, so no internal text reaches a toast; the query is `saveSetupGuideAnswer`, so
  the action needs no import alias; the two answer buttons map over `ANSWERS`. Kept:
  `lg:min-h-8` on step rows, as on the daily checklist; `offerSwitch`, the
  `completion` view and the Settings revalidation, which the spec asks for and tickets
  03/04 use.
- Spec: added domain cases for `undecided` with exactly one required step done; removed
  an explanatory line on the question card that the spec did not ask for. The user
  confirmed that archived strategies and prop firm links on archived accounts tick
  nothing; the spec's Facts now say so. A demo write is refused with the generic
  message, not the demo one; the demo user never sees the card.
- Verification: lint, typecheck, full test suite (1533 passed, none skipped) and build
  pass; migration `0033` applied locally. Browser: a new user sees the question, also
  after reload; Tab + Enter on "Yes, show me" shows the five steps with links to
  `/settings#accounts`, `/prop-firms`, `/strategies`, `/settings#checklist` and
  `/journal/new`; adding a practice account ticks the account step; "No" removes the
  card, also after reload and in a second browser; the demo user sees no card; Dark at
  1280 px and Light at 390 px without horizontal scroll. DB read shows `active` and
  `declined` for the two test users. No console errors beyond the known WebGL notice.
