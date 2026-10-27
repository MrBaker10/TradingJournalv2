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

**Status:** done

- [x] Day log: one section per trade date in the current sort; the date column stays in view while the day's entries scroll; it shows weekday, date, entry count, missed count and day net P&L in sign colour.
- [x] Time strip places the day's entries by their stored chart-clock time without applying the user's timezone; dots by sign, missed setups grey.
- [x] Entry card shows the first screenshot when there is one and no image field when there is none; notes excerpt, confluences and mistakes read without opening the entry; a missed setup is marked and shows no P&L or R.
- [x] Sorting by R renders a flat list; every other sort renders the day log; pagination keeps working.
- [x] The "Filter" menu holds range, instrument grouped by asset class and sort; each choice updates the URL with the same parameters as today; the existing journal search-parameter tests still pass.
- [x] A filtered range shows entry counts and no money total; the hidden-practice notice behaves as today.
- [x] Old journal list components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, filter by range and instrument, sort by R and back, scroll a long day, open an entry; reduced motion emulated once; no new console errors.

## Do not build

- The detail sheet, the sheet primitive or changes to the detail page; ticket 05.
- The trade form or the edit form; ticket 06.
- New filters, sorts or fields.

## Review

Gates on the final tree: `pnpm lint`, `pnpm typecheck`, `pnpm test` (83 files, 1334
tests, none skipped; the `tileLabel` tests went with their file) and `pnpm build` pass.
Browser click path with Playwright against the demo user at 1440 px, 390 px and once
with reduced motion: 73 checks pass (open, date column contents, a dot per entry,
missed dots grey, no empty image field, missed cards without P&L and R, sticky date
column while scrolling a day, range and instrument into the URL, instruments grouped
by asset class, clear filters, sort by R flat and descending and back, page 2, typed
dates as custom range, card opens `/journal/[id]`, no horizontal scroll at 390 px);
no console error and no hydration warning, only `motion`'s reduced-motion notice. A
screenshot was uploaded to one local demo trade to check the card with image.

- Agreed before implementation: typed `from`/`to` are no longer typed in the journal;
  they still apply from the URL (dashboard calendar day) and show in the menu as a
  checked custom range that a preset replaces. Time-strip dots are a picture only, the
  cards are the links. "New trade" left the page head, the shell has "Log trade";
  Import stays. Sort offers the four existing `sort`/`dir` combinations.
- Pure rule with tests: `src/lib/journal/time-strip.ts` (window padded an hour each
  side, at least four hours, kept inside the day, at most seven hour labels, rounded
  positions). Hand-built SVG with percentage attributes, no inline style.
- Fixed from review: pagination and the practice reveal use `buttonVariants` instead of
  hand-built button classes, page links no longer `muted-foreground`; the day comment
  states that the strip shows this page's entries of a split day.
- Removed with their last use: `trade-row`, `journal-filters`, `quiet-action-class`,
  `tile-label` and its test. `RANGE_PRESETS` is exported from `range-preset-chips`.
- Open, for later tickets: coding-standards → Charts puts geometry in `src/domain/**`,
  while `time-strip.ts` follows `src/lib/dashboard/ring.ts` in `src/lib/` (the spec's
  Testing Decisions allow both; the rule should be settled); `sign-tone` lives in
  `lib/dashboard` but is now shared with the journal; a signed-R formatter exists in
  the entry card, recent entries and the detail page; two comments in `prop-firms`
  (`prop-firm-filters.tsx:44`, `prop-firm-card.tsx:24`) name deleted journal files
  (ticket 10); dots at the same minute overlap; the sticky offsets follow the shell's
  56 px top bar; `JournalFilterMenu` is long.
