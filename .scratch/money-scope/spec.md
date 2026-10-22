# Spec: Money scope in one module

Status: ready-for-agent

Origin: architecture review of 2026-10-22, candidates 1 and 2. Terms: `GLOSSARY.md`
(Account scope, Real account, Practice account, Copy trade, Missed setup).

## Problem Statement

Every money figure and every list in the journal depends on one rule set: which trades
an account scope may see, and how much each trade contributes, once per real account
it was copy-traded onto, net of commission, in the display currency. That rule set is
the app's most important invariant, but today it is spread out:

- The scope module imports its building blocks from the trade queries, so the trade
  queries cannot import the scope module back. They keep their own copy of the real
  account count and their own visibility rules.
- "A missed setup always shows, a taken trade only on a real account" is written by
  hand in six places, three of them in the progress queries.
- The money a trade contributes exists as three separately written expressions (the
  figure, the journal row, the analytics split by account). Their differences are
  intentional, but nothing names or tests them side by side.
- The pure domain module that claims to own the money multiplier has no production
  callers for five of its six functions. Its tests check a version of the rule that
  never runs, while the rule that does run, in SQL, has no direct test.

For the user nothing is visibly wrong. The risk is that the next change to commissions,
currencies or copy trades fixes one copy and misses another, so a row stops matching its
total or a practice trade leaks into a combined figure.

## Solution

One module owns the account scope: every visibility condition and every money
expression for a trade. All queries take them from there. Its interface names the
three money views explicitly (figure, row, assignment), and one database test pins
how they relate to each other for every kind of account scope. The unused functions
in the domain module are removed. The visible behaviour of the app does not change.

## User Stories

1. As a trader, I want every combined figure to count a copy trade once per real account it ran on, so that my Net P&L matches what my accounts actually made.
2. As a trader, I want a journal row to show the same net amount that its day total and the dashboard add up, so that I can trust the numbers when I compare them.
3. As a trader, I want practice accounts excluded from every combined figure, so that simulated practice never inflates my real results.
4. As a trader, I want a practice account to show its own trades and figures when I select it on its own, so that I can still review my practice.
5. As a trader, I want a trade that only ran on practice accounts to open by its own link and show its amount, so that nothing disappears silently.
6. As a trader, I want missed setups to appear in the journal whatever account scope is selected, so that I see every setup I recognised.
7. As a trader, I want missed setups never to count towards P&L, win rate or R, so that a setup I did not take does not change my results.
8. As a trader, I want commissions subtracted per account, so that a copy trade's cost reflects what each account paid.
9. As a trader, I want a selected account to subtract only its own commission, so that its figures match its broker statement.
10. As a trader, I want figures in the display currency of my account scope, so that an EUR account reads in EUR.
11. As a trader, I want my streak, consistency score and badges to count entries on real accounts and missed setups, whatever account is selected, so that progress reflects my journaling, not the switcher.
12. As a trader, I want the analytics split by account to add up to the combined figure, so that the breakdown explains the total.
13. As a trader, I want the rule status of a linked account to use that account's net amounts, so that rule checks match the account.
14. As a trader, I want the weekly review summary to cover all real accounts, so that the review belongs to me and not to an account.
15. As the maintainer, I want one place that defines visibility and money per trade, so that a rule change happens once.
16. As the maintainer, I want the trade queries free of their own copies of scope rules, so that the import cycle between the two modules is gone.
17. As the maintainer, I want the three money views named in the module's interface, so that a reader sees which one a query uses and why.
18. As the maintainer, I want one database test that checks how rows, figures, weights and assignments relate per account scope, so that a regression shows up in one place.
19. As the maintainer, I want domain tests only for code that runs in production, so that a green test means the running rule is right.
20. As the maintainer, I want the project instructions to point to the module that actually owns the multiplier, so that the next contributor looks in the right place.

## Implementation Decisions

- **The scope module becomes the single owner.** It takes over from the trade queries:
  the real-account membership check, the per-trade amount in the display currency, the
  commission expressions (real accounts, one account, all accounts), the assignment
  counts and the per-account visibility. The trade queries, dashboard, analytics,
  account rules and weekly review queries import from it. Nothing imports the trade
  queries for scope or money anymore, which removes the cycle. The module keeps its
  current name.
- **The interface has three money views:**
  - *figure money*: what a trade adds to a figure in an account scope. All accounts:
    amount × real account count − real accounts' commission. One account: amount − that
    account's commission. This is the current figure expression, unchanged.
  - *row money*: what a journal row shows. Like figure money, except that a trade on
    practice accounts only, reached by its own link or the reveal banner, shows the sum
    over the accounts it does have. This is the current row expression, unchanged.
  - *assignment money*: one assignment's amount minus that assignment's commission, for
    breakdowns that fan a trade out over its accounts (analytics by account). The
    multiplier is the fan-out, never applied a second time.
  - The weight that goes with figure money stays (the real account count for all
    accounts, 1 for one account), and so do the net winner/loser splits.
- **One visibility rule.** The scope conditions take an optional visibility: `scoped`
  (default: all accounts means a real account or a missed setup; one account means
  assigned to it or a missed setup) or `owner` (one trade by its own id, ownership
  only). The trade queries' own visibility helpers are removed. The progress queries
  (streak entry days, month score days, badge counters) use the scope conditions with
  all accounts, which is their current behaviour: progress always ignores the switcher.
- **The domain accounts module keeps only the switcher grouping.** The multiplier,
  practice exclusion and aggregate-membership functions and their tests are deleted.
  Comments that point to them are rewritten to point to the scope module.
- **The project instructions change in one line:** the Accounts invariant in the agent
  instructions will name only the scope module as the owner of every money and
  visibility expression. The wording is proposed to the user before the edit.
- **No schema change, no migration, no change to any figure or list.**

## Testing Decisions

- Good tests here check observable results through the module's interface against real
  Postgres: which trades a scope sees and which cents come out. They do not check the
  shape of the generated SQL.
- **One new test seam: the scope module's interface.** A new database test builds one
  fixture: a user with two real accounts (one copy trade on both), a practice account
  (one trade on it alone, one copy trade also on a real account), a missed setup,
  per-account commissions, and a trade in a foreign profit currency. Per account scope
  (all accounts, one real account, the practice account) it checks:
  - visibility under `scoped` and `owner`
  - the sum of row money over the visible rows equals the summed figure money
  - the weight matches the real account count
  - assignment money summed over assignments equals figure money
  - a practice-only trade has row money but drops out of every figure
- **Regression:** the existing query tests stay unchanged and must pass with the
  database reachable: dashboard, journal list, analytics, display currency, account
  rules, weekly reviews, trade detail and trades parity. Skipped DB tests do not count
  as verification.
- Prior art: the formula parity tests in the trades query tests and the display currency
  tests (transaction per test, rollback, skip without a database).
- The domain accounts tests keep only the switcher grouping cases.

## Out of Scope

- Any change to what a figure, row or list shows.
- The trade write path (`saveTrade`, its own spec) and the consistency score's logged
  days (its own chore).
- P&L parity between SQL and TypeScript: already tested.
- Rule status currency: deliberately USD.
- Moving `IsoDate` or the trading day rules.
- Passing scopes instead of separate arguments to the journal and recent-trades queries.

## Further Notes

- Review findings that were dropped (P&L parity, accounts overview, trading day module)
  are recorded in the architecture review of 2026-10-22, not here.
- The new glossary term **Account scope** is committed with this spec on the feature
  branch.
