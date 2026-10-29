# User guidance

Status: ready-for-agent

## Problem Statement

A new user signs up and lands on a dashboard of "Nothing logged yet" cards. Nothing
there says that every trade belongs to an account, or that the first step is to add one
in Settings. The trade form and the import wizard show an empty account picker with no
explanation and no way forward. Only Settings itself states the rule.

The journal also relies on terms that carry non-obvious rules — a missed setup counts
for the streak but never for P&L, a practice account is kept out of every combined
figure, entry times are on the chart clock, a grace day keeps a streak alive. These
rules are written down in the product documents, but the user meets the terms in the
interface without an explanation at hand.

## Solution

Two independent pieces of in-app guidance, written in English like the rest of the app:

1. **Setup guide.** On the first dashboard visit, a card at the top asks whether the
   user wants a short setup guide. On "Yes", the card lists five steps — add an account,
   link a prop firm, create a trading strategy, set up a checklist template, log a first
   trade or missed setup — each linking to the page where it is done. Adding an account
   and logging an entry are required; the other three are optional and get a tick once
   their data exists. The user can hide the guide once an account exists, and it leaves
   by itself once both required steps are done, with one light sweep in the `process`
   colour. On "No" the card is gone and nothing is required. A switch in Settings brings
   it back while required steps are open.
2. **Term explanations.** Eleven terms that carry a non-obvious rule get a small info
   icon wherever they appear in the interface. The icon opens a popover with the
   term's definition from `GLOSSARY.md`, by click and by keyboard. These are always
   shown, whatever the user chose for the setup guide.

In addition, the account pickers in the trade form and the import wizard get a teaching
empty state when the user has no account, linking to Settings.

The guidance explains rules and where things are. It never comments on results, never
suggests how to trade and never rewards money.

## User Stories

1. As a new user, I want to be asked on my first dashboard visit whether I want a setup guide, so that I decide how much help I get.
2. As a new user, I want to answer "Yes, show me" and see the setup steps, so that I know what to do first.
3. As a new user, I want to answer "No, I'll find my way" and never see the guide again unless I ask for it, so that the dashboard stays uncluttered.
4. As a new user who declined the guide, I want to use the journal without being forced to create an account first, so that declining has no hidden obligation.
5. As a new user who has not answered yet, I want the question to stay on the dashboard until I answer, so that I do not miss it.
6. As a new user, I want the steps in a sensible order — account, prop firm, strategy, checklist, first entry — so that each step builds on the previous one.
7. As a new user, I want each step to link to the page where I complete it, so that I do not have to search the navigation.
8. As a new user, I want to see which steps are required and which are optional, so that I do not spend time on what I do not need.
9. As a new user, I want a step to show a tick as soon as its data exists, so that I see my progress without ticking anything by hand.
10. As a new user, I want to skip the optional steps simply by not doing them, so that I do not have to dismiss each one.
11. As a new user who said yes, I want the hide action to appear once I have an account, so that I can drop the guide when I no longer need it.
12. As a new user who said yes, I want the guide to leave by itself once I have an account and a logged entry, so that I do not have to clean up after myself.
13. As a new user, I want the guide to end calmly with one brief light sweep, so that finishing feels acknowledged without turning into a celebration.
14. As a user who prefers reduced motion, I want the guide to simply disappear at the end, so that no animation plays.
15. As a user who declined or hid the guide, I want a switch in Settings to bring it back, so that I can change my mind.
16. As a user whose required steps are all done, I do not want to be offered the switch in Settings, so that I am not offered an empty guide.
17. As an existing user with an account and a logged entry, I never want to be asked about a setup guide, so that a new release does not interrupt my routine.
18. As an existing user without an account or without an entry, I want to be asked once, like a new user, so that I get the same help.
19. As a visitor on the demo account, I never want to see the setup guide, so that the demo shows the finished journal.
20. As a visitor on the demo account, I want the term explanations to work, so that I understand what I am looking at.
21. As a user on another device, I want my choice about the guide to apply there too, so that I am not asked again.
22. As a user, I want the setup guide to count a practice account as an account, so that I can start with practice.
23. As a user, I want the setup guide to count a missed setup as a first entry, so that the guide follows the same rule as the streak.
24. As a user, I want the setup guide to count an imported trade as a first entry, so that importing is a valid start.
25. As a user with no account, I want the trade form to tell me that every trade belongs to an account and link me to Settings, so that I am not stuck at an empty picker.
26. As a user with no account, I want the import wizard to tell me the same, so that I am not stuck there either.
27. As a user, I want an info icon next to "Missed setup", so that I learn it counts for the streak but never for P&L, win rate or R.
28. As a user, I want an info icon next to "By the book", so that I understand what I am assessing.
29. As a user, I want an info icon next to "Practice account", so that I understand why its numbers are kept out of combined figures.
30. As a user, I want an info icon next to "Copy trade", so that I understand what logging one trade on several accounts means.
31. As a user, I want info icons next to "Streak" and "Grace day", so that I understand what keeps my streak alive.
32. As a user, I want an info icon next to "Consistency score", so that I understand what it measures and that it ignores profit.
33. As a user, I want an info icon next to "Chart clock", so that I enter times in the right clock.
34. As a user, I want info icons next to "R multiple", "MFE" and "MAE", so that I understand the risk-based figures and fill them correctly.
35. As a user, I want an info icon next to "Ledger net", so that I understand it is separate from trading P&L.
36. As a keyboard user, I want to open and close an explanation with the keyboard, so that the help is accessible.
37. As a phone user, I want to open an explanation by tapping, so that the help does not depend on hover.
38. As a user, I want explanations to use the same wording everywhere, so that one term never means two things.
39. As a user, I want the setup guide to look the same in Dark and Light, so that the theme does not change the help.
40. As a user, I want my setup guide choice to be private to me, so that nobody else's journal is affected by it.

## Implementation Decisions

- Reuse the installed stack, the existing dashboard card, settings section and
  empty-state patterns. The info popover is a new thin UI component on the installed
  `@base-ui/react` popover. No new dependency.
- **Schema:** one new non-null column on users holding the setup guide state, an
  enum of `undecided` (default), `declined`, `active`, `dismissed`, `completed`.
  Generated migration; no data backfill, because existing users are covered by the
  derived rule below.
- **Facts read for the guide**, all for the current user: has at least one active
  account (practice accounts count); has at least one trade (taken or missed,
  manual or imported); has at least one account linked to a prop firm program; has at
  least one trading strategy; has a checklist template with at least one step; is the
  demo user. An archived strategy, and a prop firm link on an archived account, tick
  nothing (confirmed 2026-10-29 during ticket 02).
- **Rules**, owned by one pure domain function that maps state and facts to what is
  shown:
  - Demo user → hidden, no Settings switch.
  - Both required steps done (account and entry) and state is not `active` → hidden.
    This covers existing users, who stay `undecided` and are never asked.
  - `undecided` → the question card.
  - `declined` or `dismissed` → hidden; the Settings switch is offered while a
    required step is open.
  - `active` with a required step open → the step list; the hide action is offered
    only when an account exists.
  - `active` with both required steps done → the completion view once: the light
    sweep plays and the state is written as `completed`.
  - `completed` → hidden, no Settings switch.
  - Optional steps show a tick when their fact is true; there is no stored "skipped".
- **Transitions:** question "Yes" → `active`; question "No" → `declined`; hide →
  `dismissed` (refused without an account); Settings switch → `active` (refused when
  both required steps are done); completion view shown → `completed`.
- A new query module owns reading the guide (state plus facts in SQL, then the domain
  function) and writing the state. All functions take the user ID and filter by it.
  Server actions resolve the user with `getCurrentUser()`, refuse writes for the demo
  user and for transitions the rules do not allow, and revalidate the dashboard and
  settings.
- **Dashboard:** the guide card sits at the top above the existing cards. The question
  has two answers: "Yes, show me" and "No, I'll find my way". Step links go to Settings
  → Accounts, Prop firms, Strategies, Settings → Checklist and Journal → New. No modal,
  overlay tour or redirect.
- **Completion feedback:** one light sweep in the `process` colour over the card, then
  the card leaves. No confetti, no toast, no badge. With reduced motion the card is
  simply gone. Completion always coincides with logging the first entry, which is
  already a process moment, so Design.md and the glossary stay unchanged.
- **Settings:** a "Show setup guide" switch, rendered only when the domain function
  offers it. Not in the command palette.
- **Empty account pickers:** the trade form and the import wizard show "Every trade
  belongs to an account." with a link to Settings → Accounts when the user has no active
  account. This applies regardless of the guide state.
- **Term explanations:** a small info icon next to the term opens a popover with the
  definition. It opens by click, tap and keyboard (Enter/Space, Escape closes), never on
  hover only, and has an accessible label naming the term. Terms: Missed setup, By the
  book, Practice account, Copy trade, Streak, Grace day, Consistency score, Chart clock,
  R multiple, MFE/MAE, Ledger net. The texts live in one constant in code, worded from
  the `GLOSSARY.md` definitions; the glossary stays the source of truth and is not read
  at runtime. Which occurrences of a term get the icon is decided per page so each term
  is explained where it first matters, not on every repetition.
- Design.md gets a short pattern for the setup guide card and the info popover, since
  neither exists yet.

## Testing Decisions

- Test externally observable behaviour; no assertions on component internals or table
  layout.
- **Domain function (Vitest):** a table of state × facts → what is shown, covering every
  rule above: demo, existing user with both required steps done, each state, the hide
  action appearing only with an account, the Settings switch appearing only while a
  required step is open, optional ticks. Prior art: `badges.test.ts`, `streak.test.ts`.
- **Query module (real Postgres, rolled-back transaction, two users):** each fact read
  correctly (practice account counts, archived account does not, missed setup and
  imported trade count), every allowed transition, refused transitions (hide without an
  account, re-enable when done, any write for the demo user), `completed` written after
  the completion view, cross-user isolation, cascade on user deletion. Prior art:
  `checklist.test.ts`, `dashboard.test.ts`.
- **Glossary check:** a test reads `GLOSSARY.md` and asserts each explained term exists
  there as an entry.
- Browser checks cover the flows in Acceptance, including phone width, keyboard use,
  both themes and reduced motion. Inspect new console errors during these flows.
- Follow the project's ordered verification gate. Relevant database tests must execute;
  skipped database cases are not passing evidence.

## Acceptance

1. Register a new user and open the dashboard: the question card shows. Reload: it is
   still there.
2. Answer "No": the card disappears. Open the trade form: the account picker shows the
   empty state with a link to Settings. Open the import wizard: same.
3. In Settings, turn on "Show setup guide": the step list shows on the dashboard, with no
   hide action.
4. Follow the account link and add a practice account: the account step is ticked and
   the hide action appears. Hide the guide: it disappears; the Settings switch is
   offered again.
5. Turn the guide back on, create a strategy: its step is ticked. Log a missed setup and
   return to the dashboard: the light sweep plays once and the card leaves. Reload: no
   card, and Settings no longer offers the switch.
6. Repeat step 5's ending with reduced motion enabled: the card is gone without
   animation.
7. Sign in as an existing user with an account and a trade: no card, no switch.
8. Sign in as the demo user: no card, no switch; the info icons work.
9. On the trade form, journal, progress, analytics, settings and ledger, open each info
   icon by click and by keyboard, close with Escape; check at phone width and in both
   themes.
10. Sign in as a second user and verify the first user's guide state has no effect.

## Out of Scope

### Do not build

- Reminders, nudges or notifications about logging, reviews or the routine.
- Any comment on results, trading advice or suggestions.
- Confetti or any celebration on finishing the guide.
- An overlay tour, modal wizard or redirect for new users.
- A separate help page or help entry in the sidebar or command palette.
- A per-step "skip" or per-step dismissal.
- Translations or an i18n setup.
- Tracking or analytics of guide usage.
- Any effect of the guide on streak, consistency score or badges.
- Reading `GLOSSARY.md` at runtime.

## Open Questions

None. Product behaviour, placement, data model and test seams were confirmed in
clarification rounds Q1–Q22 and the seam check.

## Further Notes

- New glossary entries added during clarification: **R multiple**, **MFE**, **MAE**,
  **Post-exit MFE** (`GLOSSARY.md`).
- No ADR: the setup guide state is one column and cheap to revisit; the choice of a
  calm sweep over confetti follows the existing Design.md rule.
