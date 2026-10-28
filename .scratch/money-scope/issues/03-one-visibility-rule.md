# 03: One visibility rule for every query

**What to build:** Which trades a figure or list may see is decided in one place. The
scope conditions take a visibility: *scoped* (all accounts: a real account or a missed
setup; one account: assigned to it or a missed setup) or *owner* (one trade by its own
id, ownership only). The trade queries' own visibility helpers disappear. Streak entry
days, month score days, badge counters and the progress moment check use the scope
conditions with all accounts,
which is what they do today: progress ignores the account switcher.

Spec: `.scratch/money-scope/spec.md`. Terms: `GLOSSARY.md` → Account scope, Missed setup,
Streak, Consistency score, Badge.

**Blocked by:** 01

**Status:** done

- [x] The scope conditions accept the visibility `scoped` (default) or `owner`.
- [x] No hand-written "missed setup or real account" condition remains outside the scope module.
- [x] The journal list, recent trades and trade detail use the scope conditions; the trade queries' own visibility helpers are removed.
- [x] Streak entry days, month score days, badge counters and the progress moment check (`hasProgressMoment`) use the scope conditions with all accounts.
- [x] Scope test: visibility per account scope and per mode, including the missed setup, the practice-only trade and another user's trade.
- [x] Existing dashboard, journal list, progress, trade detail and weekly review tests unchanged and passing (none skipped).
- [x] Full gate; browser check of journal, dashboard and progress with all accounts, one real account and the practice account selected.

## Review

Two-axis review of the working tree against `18c6d75`.

**Spec:** no missing or wrong requirement.
- Deliberate deviation: the `isVisibleForAccount` block in `trades.test.ts` is deleted with the helper, together with its now-unused imports. The spec lists the trades parity tests as unchanged; the parity tests themselves are untouched. The deleted cases (missed setup visible with the own and with another account selected) are in the scope test's visibility cases for Live and Demo.
- `listHiddenPracticeCounts` keeps `not hasRealAccount`: it counts the practice-only trades the reveal banner surfaces, the inverse of the rule, not a copy of it.
- `getBadgeCounters` and `getMonthScoreDays` have no direct DB test, and `getStreakEntryDays` appears only in a domain test. Their unchanged results rest on the scope test for all accounts and the browser comparison of /progress.

**Standards:** no hard violation.
- Fixed: the comment in `analytics.test.ts` that named `isVisibleForAccount` now points to the "scoped" visibility in `scope.ts`.
- Left open, judgement calls:
  - `scopeWhere({ userId, selectedAccountId: null })` now appears five times (dashboard ×3, progress, strategies). A named `allAccountsScope(userId)` would carry the reason at each call site. Not done: it copies the existing `strategies.ts` pattern.
  - `visibility` is a positional parameter after the optional `range`, so `queryTradeRows` passes `undefined` for the range. An options object would change every existing caller, outside this ticket.
  - In `owner` mode `selectedAccountId` is accepted but not read. The doc comment says so.
