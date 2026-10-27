# 12: Econ Calendar and Strategies

**What to build:** The Econ Calendar and the Strategies list read as dense tables in the
journal's table pattern: a row per item, mono figures, header and figure cells that do
not wrap, keyboard navigation by row, and a detail sheet where there is a detail (an
event's full data, a strategy's rules and assigned trades). Strategy maintenance (add,
rename, edit rules, archive) uses the form blocks from the trade form and confirms the
action ("Strategy saved"). Econ events keep being read from the stored table at request
time with their timezone-aware timestamps; the feed stays where it is.

Spec: `.scratch/redesign/spec.md` → story 96, Dense table pattern, Econ invariant.
Design: `context/Design.md`. No prototype; built from the journal ticket.

**Blocked by:** 05 (Detail sheet and trade detail page), 06 (Trade form in five steps)

**Status:** done

- [x] Econ Calendar as a dense table of the stored events in the user's timezone; a row opens the medium sheet with the event's detail; the existing filters keep their search parameters.
- [x] Strategies as a dense table; a row opens the sheet with the strategy's detail; editing uses the form blocks on one page, keeps the existing validation and the rule in ADR 0003, and confirms the action.
- [x] ↑/↓ move the focused row and Enter opens it in both tables; Esc closes the sheet; key handling inside the sheet is bound on the sheet.
- [x] Below `lg` both tables scroll horizontally inside their container; the pages keep the 16 px gutter.
- [x] Empty states explain the rule that makes them empty (no events fetched yet, no strategy created yet).
- [x] Old econ and strategies components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px for both pages: open, navigate rows, open a detail, Esc, filter events, add and edit a strategy; reduced motion emulated once; no new console errors.

## Do not build

- Changes to the econ feed, fetch or parse.
- New strategy fields or assignment behaviour.

## Review

- Decided with the user: the strategy sheet lists the trades holding the strategy
  through a new read, `listStrategyTrades`: the latest 20 per strategy plus the total,
  in one query for the page, scoped as "All accounts" (a taken trade only on practice
  accounts is left out, missed setups show). Each row links to the trade's page and is
  tagged "Missed" or "Earlier rules" (its revision is not the strategy's latest,
  ADR 0003). Recorded under Data and queries in the spec.
- Add, edit, detail and archive share one medium sheet, as on the ledger; the open
  strategy and the open event are component state, not the URL: nothing links to them,
  and the daily sync replaces every event id. The econ sheet reads the row.
- Fixed in review: a test with two strategies pins the current-rules check to its own
  strategy; the econ day rows are `rowgroup` headers of one `tbody` per day, with the
  row keys bound on the table; the assigned-trade links are 40 px tall below `lg`; the
  count column is "Assigned", since it includes missed setups; archiving that fails
  says so (`STRATEGY_ARCHIVE_FAILED`) instead of "Couldn't save".
- Shared pieces: `moveRowFocus` moved to `src/components/ui/row-focus.ts` for the three
  tables; `runWithToast` moved to `src/components/ui/toast.tsx`; `SaveButton`,
  `strategy-manager.tsx` and `econ-event-list.tsx` are removed. `StrategyRules` (also
  in the trade detail) is in the new tokens.
- Added after review, as the user asked: `hasEconEvents` tells a calendar never
  synced from a quiet range, so every tab's empty state says "No events fetched yet"
  until the first sync; it runs only when the range is empty.
- Left open: the sheets' "keep showing while sliding out" state and the dense table's
  row classes are copied across pages; ticket 16 gathers them. The filter toggles keep
  the prop firm filters' muted rest colour and independent toggles for the tabs.
- Gates: lint, typecheck, test (1439 passed, none skipped), build; `pnpm job:econ` run
  locally for this week's events; browser at 1440 px and 390 px (reduced motion):
  econ rows by ↑/↓ and Enter, Esc, high-impact and currency filters in the URL, next
  week's empty state; strategies rows by ↑/↓ and Enter, Esc, add with an empty name
  refused at the field, add and edit confirmed "Strategy saved", archive confirmed;
  38 checks, no console errors, run twice. Every strategy the runs created was found by
  a DB query and is deleted.
