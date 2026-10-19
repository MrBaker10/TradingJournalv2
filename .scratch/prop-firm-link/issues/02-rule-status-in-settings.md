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

**Status:** done

- [x] One-statement query returns the attempt's per-trading-day net P&L for one account: per-account value without multiplier, taken trades only, net of commissions, USD, Sunday rolls onto Monday like `toTradingDay`, trades before the evaluation start excluded, filtered by current user.
- [x] New pure domain module takes account rules, starting balance, day series and today's trading day and returns one status per rule (`ok` | `close` | `breached` | `not_checkable` | `not_set`) with the figures it is based on; integer minor units only.
- [x] Profit target: balance − starting balance vs target, no close state.
- [x] Static drawdown: floor = starting balance − amount; close within 20 % of the remaining allowance (named constant).
- [x] Minimum trading days: count of trading days with a taken trade, no close state.
- [x] `context/Design.md` section for rule status (written first): layout, amber/red via existing semantic tokens, no glow, the 20 % drawdown threshold named.
- [x] Vitest: static floor ok/close/breached, boundary exactly at 20 %, minimum days counting, unset rules `not_set`.
- [x] DB tests (executed): trades before evaluation start excluded; Sunday trade lands on Monday; copy trade on two linked accounts counts once per account, unmultiplied; missed setups excluded; another user's data never read.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: settings detail for a linked account shows the three rules; no new console errors.

## Review

Two-axis review (standards, spec) against `7ff280f` on 2026-10-19, uncommitted tree.

Fixed:
- `getAttemptDays` reads the sum with `toNumber` like the other queries.
- The rule status component calls `formatCents` directly instead of a `usd` wrapper;
  `Line`/`Quiet` renamed to `RuleLine`/`SubtleText`.
- GLOSSARY.md, Trading day: a Saturday rolls onto Monday for account rules (decided
  2026-10-19), while the streak still drops it.

Left open on purpose:
- Settings reads the day series once per linked active account (`Promise.all`); the
  ticket asks for a one-account query and linked accounts are few (decisions.md).
- `rules` and `ruleStatus` travel side by side and the component reads daily loss,
  consistency and the start date from the rules row; tickets 03 and 04 replace the
  `null` drawdown and the "Pending" lines with domain statuses.
- `toRuleTradingDay` exists in TypeScript and in SQL; both are pinned by tests
  (Vitest and the Sat/Sun DB case).
- `ProfitTargetStatus.status` is always `ok`: the ticket asks for one status per rule.
- Test boilerplate (`dbReachable`, `inRollback`) copied like the other DB test files.

Browser (2026-10-19, local dev, "Lucid 25k Eval"): linked LucidFlex 50k, evaluation
start 2026-01-01, target 1500, static drawdown 1500, minimum days 5 → row shows "Rule
status · Since 1 Jan 2026", "+$1,021.35 of $1,500.00" (matches the dashboard Net P&L),
"$2,521.35 to floor $23,500.00", daily loss and consistency "Not set", "24 of 5 days".
No console errors after reload. Close and breached not reproducible with local data;
covered by Vitest. The link stays on the local account for tickets 03–06.

After the checkpoint (decided by Sascha): "close" means a distance to the floor of at
most 20 % of the drawdown amount, as built. Weekend trades before a Monday evaluation
start stay excluded (filter on the trade date): on a weekend only crypto trades, which
prop firm accounts do not carry, so no extra rule or test.
