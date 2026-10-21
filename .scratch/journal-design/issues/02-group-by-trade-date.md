# 02: Group the journal by trade date

**What to build:** Sorted by date, the journal is grouped by trade date — the same
grouping as the calendar heatmap, no Sunday roll. Each group has a one-line heading with
the short date (`Mon 20 Oct`), the number of entries and, when above zero, the number of
missed setups. The counts cover the whole day within the active filters, not only the
rows on the page. Within a day, entries are ordered by entry time in the chosen
direction, and the row's meta line starts with the entry time (chart clock, as stored)
instead of the date. A day cut by the page boundary repeats its heading on the next
page with the same counts. Sorted by R, the list stays flat with the date in the meta
line; "Recent trades" on the dashboard keeps the date too. Below `sm` the heading stays
on one line and "entries" becomes the bare number. No money in the heading yet (ticket
03).

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01 (same row component)

**Status:** ready-for-agent

- [ ] Design.md first: a journal-list section describes the day heading (counts now, the total's slot reserved for 03) and §4.9 names the meta-line variant (time under a heading, date otherwise).
- [ ] Pure grouping function in the journal lib with tests: R sort flat in given order; date sort descending and ascending in that order; one group per date; heading values come from the day values, not from the page's rows; a date without day values is an error.
- [ ] Journal query returns per-date entry and missed counts for the page's dates, over the whole day within the filters; date sort orders by trade date, then entry time, both in the chosen direction. DB tests for both, including a day that runs past the page.
- [ ] Row gets one prop choosing time or date as the meta line's leading value; no timezone conversion on the stored time.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: date descending and ascending, R sort flat, a day across a page boundary, a missed-only day, dashboard "Recent trades" unchanged apart from 01; no horizontal scroll; no new console errors.
