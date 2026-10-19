# 03: Totals and ledger net in the display currency

**What to build:** Above the list the page shows the totals of payouts and expenses and
the ledger net (payouts minus expenses) in the "All accounts" display currency. When that
currency is not USD, each entry converts with the ECB rate of its entry date, rounded per
entry, then summed. Amounts in the list stay in USD as entered. The ledger net uses the
semantic money colour, without glow or celebration, and stays on this page.

Spec: `.scratch/ledger/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01 (Record and list entries without an account)

**Status:** done

- [x] Domain: ledger net as payouts minus expenses in integer minor units; Vitest covers it.
- [x] Totals aggregated in SQL in one statement, filtered by the current user.
- [x] Display currency from `withDisplayCurrency` with no selected account; the account selector does not affect the page.
- [x] Non-USD display currency: per-entry conversion with the entry date's ECB rate, rounded per entry, then summed.
- [x] Totals use the existing money formatting and semantic colour helpers; no glow.
- [x] DB tests (executed): totals and net for a user's entries; conversion per entry date in a EUR display currency; another user's entries not counted.
- [x] Net P&L, equity curve, calendar and progress unchanged.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: totals match the listed entries in USD and in EUR display currency; no new console errors.

## Review

Two-axis review (standards, spec) against `b7af897` on 2026-10-19.

Fixed:
- Expenses of zero rendered as `-$0.00` (negated zero); zero now carries no sign, like
  the list.
- The component shadowed the domain type name through an import alias; the component
  is now `LedgerTotalsCard` (`ledger-totals-card.tsx`).
- The entry list and account picker no longer wait for the display currency; only
  the totals do.

- Zero colour (decided by Sascha): any of the three figures at 0 renders unsigned in
  `--color-fg`; Design.md §4.25 now says so.
- Browser, EUR: the dev user's real accounts briefly set to EUR (approved by Sascha) —
  totals +€1,082.66 / -€218.36 / +€864.30 at the 19 Oct rate 1.1403, list unchanged in
  USD, no console errors; accounts reset to USD afterwards.

Left open on purpose:
- `entryDisplayCents` repeats the shape of `commissionDisplayCents` (trades.ts) with
  another rate date; sharing it means changing trades code outside this ticket.
- With no stored rate at all for the display currency, an entry drops out of the sums,
  the same rule as a trade's P&L (`tradeDisplayCents`).
