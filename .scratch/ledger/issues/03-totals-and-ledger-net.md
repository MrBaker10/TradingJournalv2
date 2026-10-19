# 03: Totals and ledger net in the display currency

**What to build:** Above the list the page shows the totals of payouts and expenses and
the ledger net (payouts minus expenses) in the "All accounts" display currency. When that
currency is not USD, each entry converts with the ECB rate of its entry date, rounded per
entry, then summed. Amounts in the list stay in USD as entered. The ledger net uses the
semantic money colour, without glow or celebration, and stays on this page.

Spec: `.scratch/ledger/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01 (Record and list entries without an account)

**Status:** ready-for-agent

- [ ] Domain: ledger net as payouts minus expenses in integer minor units; Vitest covers it.
- [ ] Totals aggregated in SQL in one statement, filtered by the current user.
- [ ] Display currency from `withDisplayCurrency` with no selected account; the account selector does not affect the page.
- [ ] Non-USD display currency: per-entry conversion with the entry date's ECB rate, rounded per entry, then summed.
- [ ] Totals use the existing money formatting and semantic colour helpers; no glow.
- [ ] DB tests (executed): totals and net for a user's entries; conversion per entry date in a EUR display currency; another user's entries not counted.
- [ ] Net P&L, equity curve, calendar and progress unchanged.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: totals match the listed entries in USD and in EUR display currency; no new console errors.
