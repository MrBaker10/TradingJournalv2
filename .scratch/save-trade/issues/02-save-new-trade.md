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

**Status:** ready-for-agent

- [ ] The save module exists outside the pure domain and imports nothing from `next/*`.
- [ ] The create action calls it and keeps only parsing, the user lookup, badges and refresh.
- [ ] Error messages are word for word today's.
- [ ] DB test: another user's account ids are dropped; a taken trade left without accounts fails.
- [ ] DB test: an archived account is rejected on create.
- [ ] DB test: a missed setup is saved without accounts.
- [ ] DB test: an unknown instrument and an unknown confluence or mistake tag fail with today's messages.
- [ ] DB test: commission from the account's rate; a typed amount wins; a typed amount for an account the trade is not on is ignored.
- [ ] DB test: links sent with a new trade are stored.
- [ ] DB test: a foreign profit currency uses the fake fetcher's rate; a failing fetcher still saves the trade.
- [ ] Full gate; browser check: log a taken trade, a missed setup, and a copy trade with a typed commission, and see each in the journal with the expected amounts.
