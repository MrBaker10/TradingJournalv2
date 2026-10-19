# 04: Filter by account and date range

**What to build:** The page offers its own account filter and a date range; the global
account selector is ignored. List and totals follow the active filter, so the numbers
always match the visible list. With no account filter, entries without an account are
included.

Spec: `.scratch/ledger/spec.md` (Further Notes: own account filter, confirmed 2026-10-18). Terms: `GLOSSARY.md`.

**Blocked by:** 02 (Tie an entry to a real account), 03 (Totals and ledger net in the display currency)

**Status:** done

- [x] Account filter lists the user's real accounts, including archived ones that have entries.
- [x] Date range filter on the entry date.
- [x] List and SQL totals use the same filter; the filter value is verified server-side (owned account).
- [x] Without an account filter, entries without an account are shown and counted.
- [x] DB tests (executed): totals and net for an account filter and for a date range.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: filter by account, by date range and both; totals follow; no new console errors.

## Review

Two-axis review (standards, spec) against `e2194bc` on 2026-10-19.

Fixed:
- The filter fields kept their old value when the URL changed without them (back,
  forward, a link); each now remounts on its search param, like the analytics range.
  Browser: account filter, then Back — select, list and totals all back on All accounts.
- Filter fields gained the §4.5 hover border and colour transition.
- `listLedgerFilterAccounts`: the `exists` subquery filters `ledger_entries` by user too.
- The component is `LedgerFilterBar` (`ledger-filter-bar.tsx`), so the `LedgerFilter`
  type needs no import alias; "is a filter active" lives next to the type
  (`isLedgerFilterActive`).
- One empty-state paragraph with the message chosen by the filter.
- Found in the browser: `?from=2026-02-31` passed the date pattern and crashed the page
  with a Postgres error; the ledger page now also checks the date is a real one.

Left open on purpose:
- Analytics (`?from=2026-02-31`, checked in the browser) has the same crash, and
  journal uses the same `parseDate`; fixing it means a shared date parser and touching
  both pages outside this ticket.
- `DATE_PATTERN`/`parseDate` now exist in three pages; see the point above.
- `listLedgerFilterAccounts` repeats the select and order of `listLedgerAccounts` and
  differs only in the archived rule.
- An unknown `?account=` is ignored and stays in the URL; the select shows All accounts.
- A From after To lists nothing ("No entries match this filter."); no rule in the spec.
