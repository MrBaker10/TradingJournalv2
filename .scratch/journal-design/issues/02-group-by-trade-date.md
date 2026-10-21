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

**Status:** done

- [x] Design.md first: a journal-list section describes the day heading (counts now, the total's slot reserved for 03) and §4.9 names the meta-line variant (time under a heading, date otherwise).
- [x] Pure grouping function in the journal lib with tests: R sort flat in given order; date sort descending and ascending in that order; one group per date; heading values come from the day values, not from the page's rows; a date without day values is an error.
- [x] Journal query returns per-date entry and missed counts for the page's dates, over the whole day within the filters; date sort orders by trade date, then entry time, both in the chosen direction. DB tests for both, including a day that runs past the page.
- [x] Row gets one prop choosing time or date as the meta line's leading value; no timezone conversion on the stored time.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, desktop and 390px: date descending and ascending, R sort flat, a day across a page boundary, a missed-only day, dashboard "Recent trades" unchanged apart from 01; no horizontal scroll; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `60473d1` (uncommitted diff).

- Fixed: the day-heading counts were in `--color-fg-subtle`, which §8 rules out for values; now `--color-fg-muted`, and §4.27 says so.
- Fixed: the last tie-break of the date sort was always `id desc`; it now follows the chosen direction like trade date and entry time.
- Fixed: the row prop is `metaLead` instead of `lead`; comments cite §4.27; `formatEventDayLabel`'s comment names both callers (econ calendar and journal list).
- Open on purpose: `entryTime.slice(0, 5)` also lives in the import preview; a shared chart-clock formatter would touch the import, which this round leaves alone.
- Open on purpose: the day values rebuild the list's conditions from the same three functions (ownership, `buildFilterConditions`, `visibilityCondition`) rather than one shared scope; the DB tests pin that list and headings agree (filter, practice, selected account).
- Open on purpose: `date: string` rather than `IsoDate`, which is a plain alias in the streak domain and adds no checking.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (70 files, 1171 passed, none skipped), `pnpm build` all exit 0; grouping and DB tests written red first. Browser: `/journal` headings "Tue 20 Oct 1 entry", "Mon 19 Oct 3 entries · 1 missed", time-led meta lines; missed-only day "Wed 14 Oct 1 entry · 1 missed" with "—"; `?sort=r` flat with dates (desktop and 390); `?dir=asc` ascending days and times (desktop and 390); page 1 ends and page 2 starts with "Fri 2 Oct 2 entries"; 390px "Mon 19 Oct 3 · 1 missed"; dashboard Recent trades keeps dates; no horizontal scroll; no console errors.
