# Spec: Save a trade through one module

Status: ready-for-agent

Origin: architecture review of 2026-10-22, candidate 3. Terms: `GLOSSARY.md` (Trade,
Taken trade, Missed setup, Account, Copy trade, Import batch).

## Problem Statement

Logging a trade by hand and editing it run the same long sequence: check the
instrument and the tags, check that the chosen accounts belong to the user, validate
the assignment, compute the columns and the P&L, work out each account's commission,
write the trade with its relations, store the rates the account figures need, award
badges and refresh the pages. Both server actions spell that sequence out inline, with
one deliberate difference in the ownership check: a new trade may not go onto an
archived account, while an edit keeps an archived account the trade already sits on.

None of this has a test. The rules that protect the trader's data (an account id from
the browser is never trusted, a missed setup carries no account, a typed commission
wins over the account's rate, an edit replaces the tags instead of adding to them)
are only checked by clicking through the form. A change to one of the two actions can
silently drift from the other.

## Solution

One module saves a trade, new or edited, and returns either the saved trade's id, P&L
and R or the error message the form shows today. The two server actions shrink to:
read the input, identify the user, save, award badges, refresh the pages. The rules
above get database tests through that one interface. Nothing the trader sees changes.

## User Stories

1. As a trader, I want a trade I log by hand saved with its prices, times, tags, notes and accounts, so that my journal is complete.
2. As a trader, I want an edit to save every field of the trade, so that the journal shows what I corrected.
3. As a trader, I want the P&L and R of a saved trade returned to the form, so that I see the result right after saving.
4. As a trader, I want a trade on an instrument that settles in another currency converted with the trade date's rate, so that its P&L is in USD like every other trade.
5. As a trader, I want a missed setup saved without any account, so that it never counts towards P&L, win rate or R.
6. As a trader, I want a taken trade to require at least one account, so that every taken trade belongs somewhere.
7. As a trader, I want account ids that are not mine ignored, so that nobody can write a trade onto someone else's account.
8. As a trader, I want a new trade never placed on an archived account, so that archived accounts stay closed.
9. As a trader, I want an edit to keep an archived account the trade already sits on, so that editing an old trade does not strip its history.
10. As a trader, I want an edit not to add an archived account the trade was not on, so that archiving still means closed.
11. As a trader, I want an unknown confluence or mistake tag rejected with a clear message, so that my tags stay from the fixed lists.
12. As a trader, I want an unknown instrument rejected with a clear message, so that a broken form never saves nonsense.
13. As a trader, I want an edit to someone else's trade, or to a trade that no longer exists, rejected as not found, so that my data and theirs stay apart.
14. As a trader, I want each account's commission taken from its rate for the instrument when I type none, so that I do not enter it every time.
15. As a trader, I want a commission I type for an account to win over its rate, so that I can record what the broker actually charged.
16. As a trader, I want a commission typed for an account the trade is not on ignored, so that a stale form field does not create a charge.
17. As a trader, I want an edit that keeps instrument and contracts to keep each account's stored commission, so that a rate I changed in settings since does not rewrite old trades.
18. As a trader, I want an edit that changes the instrument or the contract count to recompute rate-based commissions, so that the commission fits the trade again.
19. As a trader, I want a trade whose P&L still comes from an import file to keep no extra commission, so that the file's net P&L is not charged twice.
20. As a trader, I want an edit to replace the trade's tags and accounts, so that a tag or account I removed is really gone.
21. As a trader, I want an edit that leaves an imported value untouched to keep its import mark, so that the import batch can still be undone.
22. As a trader, I want an edit that changes an imported stop or P&L to clear that mark, so that my hand edit wins over the file.
23. As a trader, I want links I add while logging a new trade saved with it, so that my chart references are attached from the start.
24. As a trader, I want the rate of the trade date stored when the trade sits on an account kept in another currency, so that the account's figures can be shown in its currency.
25. As a trader, I want saving to succeed even when the exchange rate service is unreachable, so that journaling never waits for the ECB.
26. As a trader, I want badges awarded after a save, so that a milestone I reach shows up.
27. As a trader, I want the journal, the trade and the dashboard refreshed after a save, so that I see the new state immediately.
28. As the maintainer, I want one interface for saving a trade, so that creating and editing cannot drift apart.
29. As the maintainer, I want the save rules covered by database tests, so that a regression shows before a release.
30. As the maintainer, I want the exchange rate fetch replaceable in tests, so that tests run without network.

## Implementation Decisions

- **New module: save a trade.** It lives with the other application modules that read
  and write the database across several queries (next to badge sync and FX), not in
  the pure domain and not among the single-purpose queries. It imports nothing from
  `next/*`, so tests can call it directly.
- **Interface:** one function taking the user id, the already-parsed trade draft and an
  optional id of the trade to edit. Without an id it creates, with an id it edits. It
  returns either success with the trade id, P&L in cents and R, or failure with the
  error message the form shows today ("Instrument not found", "Trade not found", the
  tag messages, the assignment validation message). The messages stay word for word.
- **What the module owns:** instrument and tag checks; the ownership check including
  the archive rule (new: active owned accounts only; edit: active owned accounts plus
  archived ones the trade already sits on); the assignment validation; columns, P&L, R
  and points with the trade date's profit-currency rate; each account's commission
  (rate, typed amount, stored amount, recompute when instrument or contracts changed,
  none while the P&L is an import file's own); the import marks after an edit; the
  write with all relations in one transaction (links only on create, as today); storing
  the display rates of foreign-currency accounts, best effort.
- **What stays in the server actions:** parsing with the existing schemas, identifying
  the user, calling the module, awarding badges quietly, refreshing the journal, the
  edited trade and the dashboard. Badges stay outside: they run after the commit and
  swallow their own errors.
- **Dependencies passed in, with production defaults:** the exchange rate fetcher
  (ECB by default, a fake in tests) and the database executor (the shared client by
  default, a test transaction in tests). Queries the module calls that do not yet
  accept an executor gain an optional one, following the pattern the import and FX
  queries already use.
- **The import path is not touched.** It writes the file's P&L as an override, works in
  import batches with matching against existing trades, and has its own commission rule
  where the file wins. Those are different rules, not a copy.
- **No schema change, no migration, no change to the form or to any figure.**

## Testing Decisions

- Good tests call the module's interface with a draft and check what was stored and
  returned: the trade row, its accounts, tags, commissions and import marks, and the
  error message. They do not check which queries ran or in what order.
- **One test seam: the save module's interface**, against real Postgres in a rolled-back
  transaction, with a fake rate fetcher. Cases:
  - another user's account ids are dropped; a taken trade left without accounts fails
  - create rejects an archived account; edit keeps an archived account already on the
    trade and rejects one it was not on
  - a missed setup is saved without accounts
  - an unknown instrument, an unknown tag, and an edit of another user's trade fail with
    today's messages
  - commission: the account's rate applies; a typed amount wins; a typed amount for an
    account the trade is not on is ignored; an edit with unchanged instrument and
    contracts keeps the stored amount; a changed contract count recomputes
  - an edit replaces tags and accounts instead of adding
  - an edit leaves import marks on untouched values and clears a changed one
  - a foreign profit currency uses the rate the fake fetcher provides; a failing fetcher
    still saves the trade
- Prior art: the import query tests and the FX tests (transaction per test, rollback,
  executor passed in, fake fetcher, skip without a database). The pure rules the module
  calls (commission on save, import marks after edit, assignment validation, P&L) keep
  their existing domain tests.
- The server actions themselves stay without tests; they are adapters of a few lines.

## Out of Scope

- The CSV import's write path and its commission rule.
- Deleting a trade, adding or deleting links and screenshots.
- A shared helper for the user lookup or the first schema error across all actions.
- Badge awarding logic.
- P&L parity between SQL and TypeScript: already tested.
- The money scope work on `feature/money-scope`.

## Further Notes

- Independent of `feature/money-scope`; both branch from `main` and touch different
  modules.
