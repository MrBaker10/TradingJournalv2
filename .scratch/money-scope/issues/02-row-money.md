# 02: Journal row amounts come from the scope module

**What to build:** A journal row and a day total show the same net amount as today, now
taken from the scope module as *row money*. Row money equals figure money for every
trade inside an account scope; the one named exception is a trade on practice accounts
only, reached by its own link or the reveal banner, which shows the sum over the
accounts it does have. The trade queries no longer build their own row amount or row
multiplier.

Spec: `.scratch/money-scope/spec.md`. Terms: `GLOSSARY.md` → Account scope, Practice account,
Copy trade.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Row money is part of the scope module's interface; its exception for practice-only trades is documented there.
- [ ] The journal rows, day totals and trade detail use row money; the trade queries keep no row multiplier of their own.
- [ ] Scope test: per account scope, the sum of row money over the visible rows equals the summed figure money.
- [ ] Scope test: the practice-only trade has row money and drops out of every figure.
- [ ] Existing journal list, trade detail and display currency tests unchanged and passing (none skipped).
- [ ] Full gate; browser check of the journal with all accounts and with one account selected, plus a practice-only trade opened by its link.
