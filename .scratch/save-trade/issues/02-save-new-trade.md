# 02: Save a new trade through the save module

**What to build:** Logging a trade by hand works exactly as today, now through one
module that saves a trade and returns its id, P&L and R or the form's error message.
The create action shrinks to: parse the input, identify the user, save, award badges,
refresh the journal and the dashboard. The module owns the instrument and tag checks,
the ownership check (active owned accounts only), the assignment validation, columns
and P&L with the trade date's profit-currency rate, each account's commission, the
write with all relations and links in one transaction, and storing the display rates
of foreign-currency accounts, best effort. The rate fetcher and the executor are passed
in, with the ECB and the shared client as defaults.

Spec: `.scratch/save-trade/spec.md`. Terms: `GLOSSARY.md` → Trade, Taken trade, Missed
setup, Account, Copy trade.

**Blocked by:** 01

**Status:** done

- [x] The save module exists outside the pure domain and imports nothing from `next/*`.
- [x] The create action calls it and keeps only parsing, the user lookup, badges and refresh.
- [x] Error messages are word for word today's.
- [x] DB test: another user's account ids are dropped; a taken trade left without accounts fails.
- [x] DB test: an archived account is rejected on create.
- [x] DB test: a missed setup is saved without accounts.
- [x] DB test: an unknown instrument and an unknown confluence or mistake tag fail with today's messages.
- [x] DB test: commission from the account's rate; a typed amount wins; a typed amount for an account the trade is not on is ignored.
- [x] DB test: links sent with a new trade are stored.
- [x] DB test: a foreign profit currency uses the fake fetcher's rate; a failing fetcher still saves the trade.
- [x] Full gate; browser check: log a taken trade, a missed setup, and a copy trade with a typed commission, and see each in the journal with the expected amounts.

## Review

Review of `4386e1d`, two axes (Standards, Spec). No behaviour change found: order of
checks, messages, transaction boundary, return shape and revalidation match the old
`createTrade`.

- **Fixed:** the module stores the display rate of a foreign-currency account
  (spec: "storing the display rates of foreign-currency accounts, best effort"), but
  no test covered it. Added "stores the trade date's rate for an account kept in
  another currency"; it fails with `ensureDisplayRates` removed.
- **Left open on purpose:**
  - `saveTrade` is about 95 lines, `buildTradeColumns` about 80 (moved verbatim);
    coding-standards "under 50 lines where possible". Ticket 03 reshapes `saveTrade`
    for the edit path, so the split waits for it.
  - `fetcher` and `executor` travel as trailing parameters through `profitRateFor`
    and `ensureDisplayRates`, an options object in `saveTrade`: the helpers follow
    the query pattern, the interface the spec's shape.
  - Existing, moved unchanged, outside this ticket: `number` arithmetic on prices
    and points in `buildTradeColumns` and `profitRateFor` (AGENTS.md, Money), and no
    `try/catch` in `createTrade` (coding-standards, Error handling). Worth a ticket of
    their own.
  - The rate-failure test asserts only the save: the P&L falls back to the nearest
    stored rate, which depends on the local table.
- **Spec:** every checklist line covered; the helper exports and the import comment in
  `src/actions/trades.ts` go away with ticket 03.
