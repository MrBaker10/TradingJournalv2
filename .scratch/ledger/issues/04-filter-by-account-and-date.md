# 04: Filter by account and date range

**What to build:** The page offers its own account filter and a date range; the global
account selector is ignored. List and totals follow the active filter, so the numbers
always match the visible list. With no account filter, entries without an account are
included.

Spec: `.scratch/ledger/spec.md` (Further Notes: own account filter, confirmed 2026-10-18). Terms: `GLOSSARY.md`.

**Blocked by:** 02 (Tie an entry to a real account), 03 (Totals and ledger net in the display currency)

**Status:** ready-for-agent

- [ ] Account filter lists the user's real accounts, including archived ones that have entries.
- [ ] Date range filter on the entry date.
- [ ] List and SQL totals use the same filter; the filter value is verified server-side (owned account).
- [ ] Without an account filter, entries without an account are shown and counted.
- [ ] DB tests (executed): totals and net for an account filter and for a date range.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: filter by account, by date range and both; totals follow; no new console errors.
