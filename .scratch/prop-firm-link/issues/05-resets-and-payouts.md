# 05: Resets and payouts shape the attempt

**What to build:** A reset expense on a linked account in the ledger starts a new attempt
from its date, also when the reset cost $0; trades before it no longer count toward any
rule. A payout on the account inside the attempt lowers the balance from its date, so the
distance to the drawdown floor reflects the withdrawal.

Spec: `.scratch/prop-firm-link/spec.md` (Attempt boundary; Query → payouts by date).
Decisions: `docs/adr/0002-ledger-separate-from-trading-pnl.md`. Ledger terms:
`GLOSSARY.md`.

**Blocked by:** 02 (Rule status in settings)

**Status:** ready-for-agent

- [ ] Attempt start = later of the evaluation start date and the latest reset expense date on that account.
- [ ] A $0 reset expense starts a new attempt.
- [ ] The query also returns the attempt's payouts on that account by date, filtered by current user.
- [ ] Payouts lower the balance on their date for every rule that uses the balance; they are not trading P&L and do not count as a trading day.
- [ ] Vitest: a payout lowers balance and floor distance.
- [ ] DB tests (executed): trades before the latest reset excluded; $0 reset moves the boundary; ledger entries of other accounts and other users ignored.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: record a reset in the ledger and see the attempt move in settings; record a payout and see the balance drop; no new console errors.
