# 02: Rule status in settings — profit target, static drawdown, minimum days

**What to build:** For a linked account, the account's settings show its rule status for
the current attempt (from the evaluation start date until today): progress to the profit
target as a neutral figure, the distance to a static drawdown floor in money marked ok,
close (amber) or breached (red), and trading days done versus the minimum. Rules the user
left empty show as not set. Other drawdown types and rules show as not set or pending
until their tickets land.

Spec: `.scratch/prop-firm-link/spec.md` (Implementation Decisions → Query, Domain module;
Testing Decisions → Seam 1, Seam 2). Terms: `GLOSSARY.md` (Trading day, Attempt, Rule
status). The consistency *rule* is not the consistency *score*: keep it out of the score
module.

**Blocked by:** 01 (Link a real account to a prop firm program)

**Status:** ready-for-agent

- [ ] One-statement query returns the attempt's per-trading-day net P&L for one account: per-account value without multiplier, taken trades only, net of commissions, USD, Sunday rolls onto Monday like `toTradingDay`, trades before the evaluation start excluded, filtered by current user.
- [ ] New pure domain module takes account rules, starting balance, day series and today's trading day and returns one status per rule (`ok` | `close` | `breached` | `not_checkable` | `not_set`) with the figures it is based on; integer minor units only.
- [ ] Profit target: balance − starting balance vs target, no close state.
- [ ] Static drawdown: floor = starting balance − amount; close within 20 % of the remaining allowance (named constant).
- [ ] Minimum trading days: count of trading days with a taken trade, no close state.
- [ ] `context/Design.md` section for rule status (written first): layout, amber/red via existing semantic tokens, no glow, the 20 % drawdown threshold named.
- [ ] Vitest: static floor ok/close/breached, boundary exactly at 20 %, minimum days counting, unset rules `not_set`.
- [ ] DB tests (executed): trades before evaluation start excluded; Sunday trade lands on Monday; copy trade on two linked accounts counts once per account, unmultiplied; missed setups excluded; another user's data never read.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: settings detail for a linked account shows the three rules; no new console errors.
