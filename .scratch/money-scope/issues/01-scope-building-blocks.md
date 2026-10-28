# 01: Move the money building blocks into the scope module

**What to build:** Every figure and list keeps showing exactly what it shows today, but
the building blocks behind them live in one module. The scope module takes over from
the trade queries: the check whether a trade sits on a real account, a trade's amount
in the display currency, the commission expressions (real accounts, one account, all
accounts) and the counts of real and of all assignments. The second, hand-written count
of real accounts in the trade queries disappears. Every query takes these from the scope
module; the trade queries import the scope module, never the other way round.

This ticket also opens the new test seam: a database test of the scope module's
interface with one fixture for every later ticket.

Spec: `.scratch/money-scope/spec.md`. Terms: `GLOSSARY.md` → Account scope, Real account,
Practice account, Copy trade, Missed setup.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The scope module owns the real-account check, the per-trade display amount, the three commission expressions and the assignment counts; the trade queries no longer define them.
- [x] The scope module imports nothing from the trade queries; the import cycle is gone.
- [x] Comments that locate a moved building block in the trade queries (e.g. `tradeDisplayCents` in `src/domain/fx.ts`) point to the scope module.
- [x] Only one real-account count exists.
- [x] New scope DB test with the fixture from the spec: two real accounts with a copy trade, a practice account with a practice-only trade and a copy trade shared with a real account, a missed setup, per-account commissions, a trade in a foreign profit currency.
- [x] The scope test checks figure money and its weight for all accounts, one real account and the practice account.
- [x] Existing query tests unchanged and passing with the database reachable (none skipped).
- [x] Full gate from `context/ai-interaction.md`; browser check of dashboard, journal and analytics with all accounts and with one account selected shows unchanged figures.

## Review

Two-axis review of the working tree against `948a67d`.

**Spec:** no missing or wrong requirement.
- Open, named at the checkpoint: `display-currency.test.ts` and `trades.test.ts` changed their import lines only (`tradeDisplayCents`, `tradePnlCents` now from `../scope.ts`), no assertions. The alternative was a re-export from the trade queries, a second address for the moved blocks.
- Beyond the ticket, deliberately: `rateOnTradeDate` (formerly private `rateOn`) and `profitRate` moved to `src/db/queries/fx.ts`, because `tradePnlCents` (scope) and `rMultipleSortKey`/`profitRateText` (trade queries) both need them. `fx.ts` now uses `Number(row.id)` instead of `toNumber` from scope, so no scope↔fx cycle replaces the old one.
- Left for ticket 05: the comments in `scope.ts` that point to `src/domain/accounts.ts`.

**Standards:** no hard violation. Judgement calls, all left open on purpose:
- `allAccountCount`/`profitRate` are camelCase although coding-standards asks for SCREAMING_SNAKE_CASE constants. They follow the existing pattern for `sql` fragments (`realAccountCount`, `tradePnlCents`).
- `fx.ts` now also holds trade-scoped rate expressions (possible Divergent Change). Kept, because `profitRate` is no scope concept either and two modules need it.
- The correlated subquery over real assignments now appears three times in `scope.ts` (`realAccountCount`, `hasRealAccount`, `realCommissionCents`). The code was moved, not written. A candidate for later, not for this ticket.
