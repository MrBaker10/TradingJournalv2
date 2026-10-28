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

**Status:** done

- [x] Row money is part of the scope module's interface; its exception for practice-only trades is documented there.
- [x] The journal rows, day totals and trade detail use row money; the trade queries keep no row multiplier of their own.
- [x] Scope test: per account scope, the sum of row money over the visible rows equals the summed figure money.
- [x] Scope test: the practice-only trade has row money and drops out of every figure.
- [x] Existing journal list, trade detail and display currency tests unchanged and passing (none skipped).
- [x] Full gate; browser check of the journal with all accounts and with one account selected, plus a practice-only trade opened by its link.

## Review

Two-axis review of the working tree against `8c70b49`.

**Spec:** no missing or wrong requirement.
- Fixed: the comment above `listJournalDayValues` claimed the scope test pins the day heading equal to the calendar. The scope test compares under `scopeWhere`, while the list keeps its own visibility until ticket 03. The comment now names `journal-list.test.ts`, which compares against `getDayTotals`.
- Done after the review: browser check of a practice-only trade by its link, with a temporary trade inserted into the local DB on "Sim (test)" and deleted afterwards (only id created since the run started, checked by query).
- Beyond the ticket, deliberately: `rowCommission` is public because the detail breakdown nets out the same commission. `allCommissionCents` got the `"USD"` default of its siblings, because `QueryScope.currency` is optional.
- Accepted: the sum check per scope adds little over the per-trade `row === money` expectations. It is the relation the spec names, so it stays.

**Standards:** no hard violation. Judgement calls, left open on purpose:
- `rowCommission` and `rowMultiplier` repeat the branch on `selectedAccountId` and on `realAccountCount > 0`. Expressing `rowMoney` as `moneyContribution` plus the practice-only fallback would make "equal inside a scope" true by construction. Not done: the ticket asks for the current expression, unchanged.
- `.scratch/journal-design/issues/03-day-total-in-heading.md` still names `tradeNetDisplayCents` and the old import cycle. Done tickets are history and stay as written.
