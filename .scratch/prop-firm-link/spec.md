# Spec: Account ↔ prop firm program link

Status: done

Roadmap: `context/project-overview.md` → Phase 3, item 4. Terms: `GLOSSARY.md`.
Decisions: `docs/adr/0001-user-entered-account-rules.md`,
`docs/adr/0002-ledger-separate-from-trading-pnl.md`. Depends on: `.scratch/ledger/`.

## Problem Statement

A trader on an evaluation or funded account has to keep the firm's rules in their head:
how far to the profit target, how close to the drawdown floor, whether today's loss is
near the daily limit, whether one big day breaks the consistency rule, how many trading
days are still missing. The journal has every trade and the rules reference has every
program, but nothing connects the two, so a breach is noticed only when the firm reports
it.

## Solution

A real account can be linked to a prop firm program. While linking, the user enters the
account rules they bought — starting balance, evaluation start date, profit target, max
drawdown with its type and optional lock level, daily loss limit, consistency percentage,
minimum trading days — with the program's rule text shown beside each field. From then on
the app evaluates the current attempt against those rules. When exactly one linked account
is selected, the dashboard shows a "Rule status" card: each rule as ok, close or breached,
with the distance in money or days. Account settings show the same detail. A reset expense
in the ledger starts a new attempt; payouts lower the balance. Nothing celebrates, nothing
notifies, nothing moves the score.

## User Stories

1. As a prop trader, I want to link one of my real accounts to a prop firm program, so that the app knows which rules apply.
2. As a prop trader, I want to see the program's rule text next to each rule field while linking, so that I can type the numbers I actually bought.
3. As a prop trader, I want to enter the profit target in USD, so that progress can be measured.
4. As a prop trader, I want to enter the max drawdown amount and choose static or EOD trailing, so that the floor is computed the way my firm does it.
5. As a prop trader, I want to enter an optional lock level for an EOD trailing drawdown, so that the floor stops trailing where my firm locks it.
6. As a prop trader on an intraday-trailing program, I want to mark the drawdown as intraday trailing and see it as "not checkable", so that I am never shown a wrong floor.
7. As a prop trader, I want to enter an optional daily loss limit, so that today's loss is checked.
8. As a prop trader, I want to enter an optional consistency percentage, so that my best day is checked against total profit.
9. As a prop trader, I want to enter optional minimum trading days, so that I know how many days are still missing.
10. As a prop trader, I want to leave any rule empty when my program has none, so that only real rules are checked.
11. As a prop trader, I want to set the evaluation start date, so that earlier trades on the account do not count.
12. As a prop trader, I want the account's existing starting balance used as the attempt's starting balance, so that I enter it only once.
13. As a prop trader, I want my entered rules to stay as they are when the firm changes its program, so that my account is judged by what I bought.
14. As a prop trader, I want to edit or remove the link later, so that a mistake is fixable.
15. As a trader, I want practice accounts not offered for linking, so that practice stays outside every rule.
16. As a prop trader, I want a reset expense on the account in the ledger to start a new attempt from its date, so that pre-reset trades no longer count.
17. As a prop trader with a free reset, I want a $0 reset expense to start a new attempt too, so that the boundary is still recorded.
18. As a funded trader, I want a payout on the account to lower the balance used for rule checks, so that the drawdown distance reflects the withdrawal.
19. As a prop trader, I want progress to the profit target shown as a neutral figure, so that reaching it informs rather than rewards.
20. As a prop trader, I want the distance to the drawdown floor shown in money, so that I know how much room is left.
21. As a prop trader, I want today's distance to the daily loss limit shown, so that I can stop in time.
22. As a prop trader, I want the consistency check to show my best day against total profit and the limit, so that I see whether one day dominates.
23. As a prop trader, I want trading days counted with a Sunday trade landing on Monday, so that days match the streak and the Globex week.
24. As a copy trader, I want each linked account judged by its own per-account value, never a multiplied one, so that each account's balance is right.
25. As a prop trader, I want each rule marked ok, close (amber) or breached (red), so that I see trouble at a glance.
26. As a prop trader, I want the "Rule status" card on the dashboard only when exactly one linked account is selected, so that rules are never shown against a combined figure.
27. As a prop trader, I want the full rule detail in the account's settings, so that I can check it without switching the selector.
28. As a funded trader, I want my funded account linked separately with its own rules, so that evaluation rules such as consistency do not follow me.
29. As a prop trader, I want a breached account to stay active until I archive it, so that nothing changes behind my back.
30. As a trader, I want no notification, badge, score change or celebration from any rule state, so that the journal keeps rewarding behaviour only.
31. As a trader, I want missed setups ignored by every rule, so that only taken trades move balances.

## Implementation Decisions

- **Schema (generated migration):** a table for account rules, at most one row per
  account: account (cascade on account deletion), program (restrict), evaluation start
  date, profit target, drawdown amount, drawdown type (`static` | `eod_trailing` |
  `intraday_trailing`), optional lock level, optional daily loss limit, optional
  consistency percentage, optional minimum trading days. Money as `numeric` in USD.
  The account's existing `starting_balance_usd` is the starting balance; linking requires
  a non-zero starting balance.
- Only real accounts can be linked; verified in the query layer, not only in the form.
  Setting an account to practice while it is linked is refused with a clear message.
- **Attempt boundary:** the later of the evaluation start date and the latest reset
  expense date on that account in the ledger. Payouts on that account inside the attempt
  lower the balance on their date.
- **Query (one statement):** the attempt's per-trading-day net P&L for one account,
  per-account value with no multiplier, taken trades only, net of commissions as the
  money figures already are, in USD; trading day uses the same Sunday→Monday rule as the
  streak (`toTradingDay`), expressed in SQL. Plus the attempt's payouts by date.
- **Domain module (pure, new):** input = account rules, starting balance, the day series
  and payouts, today's trading day; output = one status per rule (`ok` | `close` |
  `breached` | `not_checkable` | `not_set`) with the figures it is based on:
  - profit target: balance − starting balance vs target;
  - drawdown static: floor = starting balance − amount;
  - drawdown EOD trailing: floor = highest end-of-day balance − amount, ratcheting only on
    new EOD highs, capped at the lock level when set;
  - intraday trailing: always `not_checkable`;
  - daily loss limit: today's net vs limit;
  - consistency: best day ÷ total profit vs percentage; only when total profit > 0;
  - minimum trading days: count of trading days with a taken trade.
  - "Close" threshold: 20 % of the remaining allowance (drawdown, daily loss) or within
    5 percentage points of the consistency limit; one constant each, set here and named in
    `context/Design.md`. Profit target and minimum days have no "close" state.
- All money arithmetic in integer minor units; no `number` arithmetic on amounts.
- **UI:** link form in the account editor in settings (explicit save, same editor pattern
  as the account settings redesign); "Rule status" card on the dashboard behind the
  single-linked-account condition; detail in settings. Amber/red follow the existing
  semantic tokens; no glow. `context/Design.md` section first.
- Display currency: rule figures stay in USD, like prop firm limits.

## Testing Decisions

- A good test feeds inputs through the public interface and asserts the status and
  figures a trader would read; no assertions on internals.
- **Seam 1: the pure account-rules domain module** (prior art: `equity.ts`, `streak.ts`
  and their Vitest suites). Cases: static floor; EOD trailing ratchets only on new highs
  and never down; lock level caps the floor; intraday trailing is `not_checkable`; daily
  loss ok/close/breached on today only; consistency skipped at zero or negative total;
  minimum days counting; a payout lowering balance and floor distance; unset rules
  `not_set`; threshold boundaries exactly at 20 %.
- **Seam 2: the attempt day-series query** against real Postgres (prior art:
  `dashboard.test.ts`, `starting-balance.test.ts`). Cases: trades before the evaluation
  start and before the latest reset excluded; a Sunday trade lands on Monday; a copy trade
  on two linked accounts counts once per account, unmultiplied; missed setups excluded;
  another user's data never read; practice account linking refused.
- DB tests must execute, not skip; full gate plus browser click path (link an account,
  dashboard card with one linked account selected, card hidden for "All accounts", reset
  in the ledger moves the attempt).

## Out of Scope

- Curated numeric rule columns per program, or parsing `PropFirmsData.md` into numbers
  (ADR 0001).
- Intraday trailing computation, overnight and news-window flags.
- Payout eligibility rules (qualifying days, payout cycles, caps), scaling plans.
- Notifications of any kind, automatic archiving, a phase field.
- Rule status in the combined "All accounts" view.

## Further Notes

- Lands after the ledger spec, which provides reset and payout entries.
- Confirmed 2026-10-18: linking requires a starting balance, a linked account cannot
  become practice, and the "close" thresholds are 20 % / 5 points.
- The "close" thresholds are a starting point; changing them later is a constant and a
  Design.md line, not a schema change.
