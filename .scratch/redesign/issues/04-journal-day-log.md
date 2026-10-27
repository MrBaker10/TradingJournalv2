# 04: Journal as a day log

**What to build:** The journal reads as a diary. One section per trade date with a
sticky date column showing weekday, date, entry count, missed count and the day's net
P&L; a time strip of the day's entries on the chart clock with dots coloured by sign and
missed setups grey; each entry as a card with the first screenshot, a notes excerpt,
confluences and mistakes. A card without a screenshot has no image field. Missed setups
sit in the same structure as trades, only marked. Sorted by R the journal is a flat list
without day headings. One "Filter" menu holds range, instrument (grouped by asset
class) and sort; the journal's search parameters are unchanged. A filtered range shows
counts and never a money total. Clicking an entry opens the existing detail page in
this ticket; the sheet comes in ticket 05.

Spec: `.scratch/redesign/spec.md` → Journal, Dense list and detail pattern. Design:
`context/Design.md`. Source: the winning view on `prototype/redesign-journal` and the
verdict in its commit body; rewrite, do not copy.

**Blocked by:** 02 (Shell and tokens)

**Status:** ready-for-agent

- [ ] Day log: one section per trade date in the current sort; the date column stays in view while the day's entries scroll; it shows weekday, date, entry count, missed count and day net P&L in sign colour.
- [ ] Time strip places the day's entries by their stored chart-clock time without applying the user's timezone; dots by sign, missed setups grey.
- [ ] Entry card shows the first screenshot when there is one and no image field when there is none; notes excerpt, confluences and mistakes read without opening the entry; a missed setup is marked and shows no P&L or R.
- [ ] Sorting by R renders a flat list; every other sort renders the day log; pagination keeps working.
- [ ] The "Filter" menu holds range, instrument grouped by asset class and sort; each choice updates the URL with the same parameters as today; the existing journal search-parameter tests still pass.
- [ ] A filtered range shows entry counts and no money total; the hidden-practice notice behaves as today.
- [ ] Old journal list components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, filter by range and instrument, sort by R and back, scroll a long day, open an entry; reduced motion emulated once; no new console errors.

## Do not build

- The detail sheet, the sheet primitive or changes to the detail page; ticket 05.
- The trade form or the edit form; ticket 06.
- New filters, sorts or fields.
