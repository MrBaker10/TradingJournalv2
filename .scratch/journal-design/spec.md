# Spec: Design round Journal

Status: ready-for-agent

Roadmap: design rounds after `.scratch/progress-analytics-design/`. Terms: `GLOSSARY.md`.
Decided in a grilling session on 2026-10-21 (Q1–Q19).

## Problem Statement

The journal list was built in S5 and never held against the other screens. Up to 25
entries stand as one flat list with nothing that says where one day ends and the next
begins. The filter card at the top weighs more than the entries it filters. Nothing
tells the trader how many entries the current filters hold or how many of them are
missed setups. Each row carries up to five equally grey chips (direction, result,
grade, confluence count), so nothing stands out. The meta line repeats a date that a
day heading would already state. The result chip is gross while the amount is net of
commission, so a "Win" can sit beside a red amount. On a phone the chips wrap, rows get
different heights and the filter card fills the screen. The same sentence covers "no
entries at all" and "no entries match these filters".

## Solution

A design round that changes presentation, with two named data additions: a day total
per day heading and a taken/missed count for the current filters. The dashboard is the
yardstick (Design.md §1, §4.7, §4.14). Every decision is checked on desktop and at
390px.

Sorted by date, the journal is grouped by **trade date**, the same grouping as the
calendar heatmap. Each group has a heading with the date, the number of entries, the
number of missed setups and the day's net P&L. Sorted by R, the list stays flat. A slim
one-line filter bar replaces the filter card, with the Analytics range presets as chips.
On a phone it folds behind a "Filters" button. A quiet count line states how many
entries match. The row gets a clear hierarchy: symbol and direction as text, chips only
for missed, grade and confluence count. Two distinct calm empty states replace the
single sentence.

## User Stories

1. As a trader, I want my journal grouped by trade date when sorted by date, so that I see where one day ends and the next begins.
2. As a trader, I want the journal grouped the same way as the calendar heatmap, so that a day in the calendar and a day in the journal hold the same entries.
3. As a trader, I want a Sunday entry under its own Sunday heading, so that it does not appear under a Monday I did not trade on.
4. As a trader, I want each day heading to show the date in short form, so that I can find a day quickly.
5. As a trader, I want each day heading to show how many entries the day holds, so that I see how busy the day was.
6. As a trader, I want each day heading to show how many of them were missed setups, so that missed setups are counted as journal entries in their own right.
7. As a trader, I want each day heading to show the day's net P&L, so that I see the day's outcome without opening the dashboard.
8. As a trader, I want the day's net P&L in green or red without glow, so that money stays as calm as everywhere else.
9. As a trader, I want the day's net P&L to match the calendar when no instrument filter is set, so that I never see two different numbers for the same day.
10. As a trader, I want the day's net P&L to follow the instrument filter when one is set, so that the heading describes the entries below it.
11. As a trader, I want copy trades in the day total multiplied by their real accounts exactly as in the calendar, so that the total is right for copy trading.
12. As a trader, I want practice-only entries excluded from the day total in the combined view, so that simulated results never mix with real ones.
13. As a trader with a practice account selected, I want the day total for that account alone, so that I can review practice days completely.
14. As a trader, I want a day with only missed setups to show no amount, so that no zero suggests a traded day.
15. As a trader, I want the day total to cover the whole day even when the day runs over a page boundary, so that the heading never shows a partial number.
16. As a trader, I want a day that continues on the next page to repeat its heading there, so that I always know which day an entry belongs to.
17. As a trader, I want the entries within a day ordered by entry time in the chosen direction, so that the day reads as it happened.
18. As a trader, I want the row's meta line to show the entry time instead of the date under a day heading, so that the row does not repeat the heading.
19. As a trader, I want the list to stay flat when sorted by R, so that the best and worst trades are not torn apart by day headings.
20. As a trader, I want the date in the meta line when the list is flat, so that each row still says when it happened.
21. As a trader, I want "Recent trades" on the dashboard to keep the date in the meta line, so that it still reads without day headings.
22. As a trader, I want a slim one-line filter bar, so that the filters weigh less than the entries.
23. As a trader, I want the same range presets as on Analytics, so that both pages filter the same way.
24. As a trader, I want custom from and to dates beside the presets, so that I can still pick any range.
25. As a trader, I want the instrument filter grouped by asset class as today, so that I still find an instrument among 117.
26. As a trader, I want the sort switch in the filter bar, so that sorting sits with filtering.
27. As a trader, I want a "Clear" control only while a filter is active, so that the bar shows nothing I cannot use.
28. As a trader on a phone, I want the filters folded behind a "Filters" button that shows how many are active, so that the list starts near the top of the screen.
29. As a trader, I want a count line such as "42 entries · 38 taken · 4 missed" above the list, so that I know how much the current filters hold.
30. As a trader, I want the count line without a money total, so that the journal does not become a second dashboard.
31. As a trader, I want the hidden-practice banner directly under the count line and unchanged, so that nothing disappears silently.
32. As a trader, I want the direction as plain text after the symbol, so that it reads as part of the title rather than a tag.
33. As a trader, I want no win/loss chip on a row, so that the amount's colour and R are the only result signal and never contradict a gross label.
34. As a trader, I want chips only for missed, grade and confluence count, so that the chips that remain carry information.
35. As a trader, I want missed setups built exactly like taken trades apart from the tile colour and the missed chip, so that they stay equal entries.
36. As a trader on a phone, I want a row to show only symbol, direction and the missed chip in its title line, so that every row stays two lines high.
37. As a trader on a phone, I want the amount never cut off, so that I can always read it.
38. As a trader on a phone, I want the day heading on one line with the total on the right, aligned with the amounts below, so that the total reads as the column's sum.
39. As a trader on a phone, I want the page title kept as on every other page, with Import and New trade beside it, so that the journal follows the same shell pattern.
40. As a new trader, I want an empty journal to say "No entries yet." and point to New trade and Import, so that I know how to start.
41. As a trader, I want filters with no match to say "No entries match these filters." with a "Clear filters" control, so that I can get back to my entries in one click.
42. As a trader, I want both empty states calm, in a card surface without illustration or accent colour, so that an empty list is not dramatised.
43. As a trader, I want the account switcher to remain the journal's account filter, so that there is one place to choose accounts.

## Implementation Decisions

- **Presentation first, two named data additions.** No schema, migration or product
  rule changes. The two additions live in the existing journal list query:
  - a **count for the current filters split into taken and missed**, beside the total
    count it already returns (two filtered counts in the same aggregate);
  - **day values for the trade dates on the current page**: entry count, missed count
    and net P&L per trade date, over the whole day within the active filters (date range
    and instrument), not only the page's rows. Money uses the same per-account
    contribution expression as the calendar's day totals, so multiplier, practice
    exclusion and display currency are identical. A day with only missed setups has no
    amount.
- **Order within a day.** When sorted by date the query orders by trade date, then entry
  time, both in the chosen direction. The R sort is unchanged.
- **Grouping is a pure function** in the journal lib beside the tile label. Input: the
  page's rows, the day values, the sort. Output: a flat list when sorted by R, otherwise
  an ordered list of day groups, each with its heading data (trade date, entry count,
  missed count, optional amount) and its rows. A day cut by the page boundary simply
  appears as a group again on the next page, with the same heading values.
- **Trade row variant.** The row gets one prop that chooses the meta line's leading
  value: entry time (chart clock, as stored, no timezone conversion) under a day
  heading, the date otherwise. "Recent trades" and the flat R list use the date.
- **Row title line.** Symbol, then the direction as muted text (`MNQ · Short`). Chips
  only for missed, grade and confluence count. The result chip is removed. Below `sm`
  grade and confluence count are hidden; the detail page carries both.
- **Day heading.** One line: short date (`Mon 20 Oct`), entry count, missed count when
  above zero; the total on the right in mono, semantic colour, no glow, aligned with the
  row amounts. Below `sm` "entries" becomes the bare number.
- **Filter bar.** One line: the Analytics range presets as chips, then from/to dates,
  the instrument select grouped by asset class, the sort switch on the right, "Clear"
  only with an active filter. Filters stay in search params; changing one resets to
  page 1. Below `sm` folded behind "Filters (n)". The preset logic is shared with
  Analytics rather than copied, if Analytics keeps it in a reusable place; otherwise the
  ticket extracts it.
- **Count line** in the subtle text colour, counts only, no money. The hidden-practice
  banner follows it unchanged.
- **Page header.** The `page-title` stays on all widths, as on every other page; Import
  (calm surface) and New trade (primary) to its right.
- **Empty states.** Two states in a `card-surface edge`: no entries at all ("No entries
  yet." with New trade and Import) and no match for the filters ("No entries match these
  filters." with "Clear filters"). Which one shows is decided by whether any filter is
  active.
- **Account filter.** The shell's account switcher is the journal's account filter.
  `project-overview.md` is corrected where it asks for a separate account filter in the
  journal list.
- **Design.md first.** §4.9 (row and its variant) and a new journal-list section (day
  heading, filter bar, count line, empty states) are written before the UI of each
  ticket. Prototypes are thrown away, never committed.

## Testing Decisions

- A good test checks behaviour through the public interface, with expected values
  written out by hand, never recomputed the way the code does it.
- **Seam 1: the pure grouping function** (prior art: the tile-label tests in the
  journal lib). Cases: R sort returns a flat list in the given order; date sort
  descending and ascending produce groups in that order; rows of one date stay in one
  group; a group's heading carries the day values, not counts of the page's rows (a day
  cut by the page boundary); a day with only missed setups has no amount; a date
  without day values is an error rather than a silent zero.
- **Seam 2: the journal list query** (prior art: the existing trades query tests against
  Postgres). Cases: taken/missed counts for the filters; day values cover the whole day
  beyond the page; copy trade multiplied by its real accounts and not by practice ones;
  practice-only entries excluded from the combined day value; the instrument filter
  narrows the day value; without an instrument filter the day value equals the
  dashboard's day total for the same date; entries within a day ordered by entry time.
- No component tests: the project has no component test harness.
- Full gate from `context/ai-interaction.md` per ticket, plus browser checks on desktop
  and at 390px: grouped and flat lists, a day across a page boundary, a missed-only day,
  active and cleared filters, folded filters on a phone, both empty states, the
  hidden-practice banner, "Recent trades" on the dashboard; no horizontal scroll, no new
  console errors. Browser checks need the Chrome extension connected.

## Out of Scope

- Trade detail, edit and import pages.
- A money total for the filtered range.
- A separate account filter on the journal page.
- New filters (session, setup, confluence, result) or changes to page size.
- Hiding the page title under `lg`; the duplicate with the top bar affects every page
  and would be its own round.
- Changes to the calendar, the metric panel or other dashboard elements beyond the
  shared row.
- Light mode, charts, infinite scroll.

## Further Notes

- Grouping by trade date rather than trading day was chosen so that the journal and the
  calendar agree; `GLOSSARY.md` now separates the two terms.
- The day total follows every active filter; with an instrument filter it differs from
  the calendar on purpose (confirmed 2026-10-21).
- The page-title question was settled by the existing pattern: every page keeps its
  `page-title` below `lg`.
- No ADR: nothing here is hard to reverse.
