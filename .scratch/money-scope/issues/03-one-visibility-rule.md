# 03: One visibility rule for every query

**What to build:** Which trades a figure or list may see is decided in one place. The
scope conditions take a visibility: *scoped* (all accounts: a real account or a missed
setup; one account: assigned to it or a missed setup) or *owner* (one trade by its own
id, ownership only). The trade queries' own visibility helpers disappear. Streak entry
days, month score days and badge counters use the scope conditions with all accounts,
which is what they do today: progress ignores the account switcher.

Spec: `.scratch/money-scope/spec.md`. Terms: `GLOSSARY.md` → Account scope, Missed setup,
Streak, Consistency score, Badge.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The scope conditions accept the visibility `scoped` (default) or `owner`.
- [ ] No hand-written "missed setup or real account" condition remains outside the scope module.
- [ ] The journal list, recent trades and trade detail use the scope conditions; the trade queries' own visibility helpers are removed.
- [ ] Streak entry days, month score days and badge counters use the scope conditions with all accounts.
- [ ] Scope test: visibility per account scope and per mode, including the missed setup, the practice-only trade and another user's trade.
- [ ] Existing dashboard, journal list, trade detail and weekly review tests unchanged and passing (none skipped).
- [ ] Full gate; browser check of journal, dashboard and progress with all accounts, one real account and the practice account selected.
