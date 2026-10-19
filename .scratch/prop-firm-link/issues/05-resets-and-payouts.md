# 05: Resets and payouts shape the attempt

**What to build:** A reset expense on a linked account in the ledger starts a new attempt
from its date, also when the reset cost $0; trades before it no longer count toward any
rule. A payout on the account inside the attempt lowers the balance from its date, so the
distance to the drawdown floor reflects the withdrawal.

Spec: `.scratch/prop-firm-link/spec.md` (Attempt boundary; Query → payouts by date).
Decisions: `docs/adr/0002-ledger-separate-from-trading-pnl.md`. Ledger terms:
`GLOSSARY.md`.

**Blocked by:** 02 (Rule status in settings)

**Status:** done

- [x] Attempt start = later of the evaluation start date and the latest reset expense date on that account.
- [x] A $0 reset expense starts a new attempt.
- [x] The query also returns the attempt's payouts on that account by date, filtered by current user.
- [x] Payouts lower the balance on their date for every rule that uses the balance; they are not trading P&L and do not count as a trading day.
- [x] Vitest: a payout lowers balance and floor distance.
- [x] DB tests (executed): trades before the latest reset excluded; $0 reset moves the boundary; ledger entries of other accounts and other users ignored.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: record a reset in the ledger and see the attempt move in settings; record a payout and see the balance drop; no new console errors.

## Review

Two-axis review (standards, spec) against `21ad78c` on 2026-10-20, uncommitted tree.

Fixed:
- The reset subquery binds the account id as a parameter instead of correlating to
  `account_rules.account_id` (coding-standards → Database).
- One `AttemptRowKind` alias for the three `unionAll` branches; payout cents converted
  like `ledger.ts` (`amount * 100`).
- Stale `getAttemptDays` references in the domain contract; the contract names the
  payouts and that payouts after today wait too.
- A reset dated after today waits for its day (decided by Sascha, see below):
  `getAttempt` takes the user's calendar date; DB test added.

Left open on purpose:
- Rows are sorted in TypeScript after the `unionAll`, not by an `orderBy` on the union.
- `endOfDayBalances` adds days and payouts in two small loops; `evaluateRules` filters
  both by today the same way.
- `attempt: { start, status }` stays an inline type on `AccountRowData`.
- The reset subquery appears in all three branches; fine at a trader's data size.

Decided by Sascha at the checkpoint: a payout lowers the profit target progress too
(it is balance − starting balance); a reset dated after today counts from its day.

Browser (2026-10-20, local dev, "Lucid 25k Eval", evaluation start 2026-01-01): ledger
reset expense $0 on 2026-09-15 → settings "Since 15 Sep 2026", "+$1,051.60 of
$1,500.00", "8 of 5 days" (before: Since 1 Jan 2026, +$1,021.35, 24 days); ledger
payout $300 on 2026-09-28 → "+$751.60 of $1,500.00", "$1,751.60 to floor $24,000.00",
consistency total unchanged at $1,051.60, still 8 days. No console errors. Both ledger
entries stay in the local data.
