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

**Status:** ready-for-agent

- [ ] The scope module owns the real-account check, the per-trade display amount, the three commission expressions and the assignment counts; the trade queries no longer define them.
- [ ] The scope module imports nothing from the trade queries; the import cycle is gone.
- [ ] Comments that locate a moved building block in the trade queries (e.g. `tradeDisplayCents` in `src/domain/fx.ts`) point to the scope module.
- [ ] Only one real-account count exists.
- [ ] New scope DB test with the fixture from the spec: two real accounts with a copy trade, a practice account with a practice-only trade and a copy trade shared with a real account, a missed setup, per-account commissions, a trade in a foreign profit currency.
- [ ] The scope test checks figure money and its weight for all accounts, one real account and the practice account.
- [ ] Existing query tests unchanged and passing with the database reachable (none skipped).
- [ ] Full gate from `context/ai-interaction.md`; browser check of dashboard, journal and analytics with all accounts and with one account selected shows unchanged figures.
