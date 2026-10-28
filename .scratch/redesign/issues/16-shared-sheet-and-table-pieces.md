# 16: Shared sheet and dense table pieces

**What to build:** A refactor with no visible change. Two pieces of the redesign are
copied from page to page and should live in one place each:

- **The sheet keeps showing its target while it slides out.** Every sheet holds the
  last target in state, compares it by key during render and falls back to it once the
  target is cleared (`const [shown, setShown] = useState(target)` and the lines after
  it). Today in `ledger-sheet.tsx`, `strategy-sheet.tsx`, `econ-sheet.tsx`, and in a
  similar form in `journal-detail-sheet.tsx`, `dimension-sheet.tsx`, `firm-sheet.tsx`
  and `account-sheet.tsx`. One hook (for example `useRetainedTarget(target, keyOf)`)
  replaces the copies.
- **The dense table's chrome** (Design.md §3.4): the scroll box (`relative
  overflow-x-auto rounded-xl border`), the header row classes, the row classes for
  hover, focus, selected and the stretched opener, and the chevron cell. Today in
  `ledger-table.tsx`, `strategy-table.tsx`, `econ-table.tsx` and
  `settings/accounts-table.tsx`. `moveRowFocus` already lives in
  `src/components/ui/row-focus.ts`; the rest joins it as shared classes or small
  components.

Noted in ticket 12's review. Spec: `.scratch/redesign/spec.md` → Dense table, Sheet.
Design: `context/Design.md` §3.4, §3.10.

**Blocked by:** 12 (Econ Calendar and Strategies)

**Status:** done

- [x] One hook serves every sheet that keeps its target while it slides out; no copy of the `shown`/`setShown` block remains.
- [x] The dense tables share their scroll box, header, row and chevron styling from one place; each table keeps only its columns.
- [x] Nothing changes on screen or by keyboard: rows by ↑/↓ and Enter, Esc, the sheet's slide-out content and reduced motion behave as before.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px for the ledger, econ calendar, strategies, settings accounts, journal detail, analytics detail and firm sheet: open, navigate rows, open a detail, Esc while it slides out; no new console errors.

## Do not build

- Changes to what a sheet or table shows, or to any query.
- A generic table component that takes column definitions; the tables keep their own markup for their columns.

## Review

- Started by the user from `needs-triage`; taken as triaged.
- `useRetainedTarget(target, keyOf)` in `src/hooks/use-retained-target.ts` serves all
  seven sheets. Ledger, strategy, econ, account and firm swap their copy for it.
  Journal detail and analytics detail kept a separate `open` flag beside a target that
  was never cleared; they now hold a nullable target, derive `open` from it and clear
  it on close, so the hook keeps the content during the slide-out as in the others.
  `finalFocus`, the metric switch and the body keys are unchanged.
- `src/components/ui/dense-table.tsx`, beside `row-focus.ts`: `TABLE_BOX`,
  `TABLE_HEAD_ROW`, `TABLE_HEAD_CELL`, `TABLE_ROW`, `ROW_OPENER`, `OpenColumnHead`
  and `ChevronCell`. Tables add their own `align-top`, last-row border and
  `text-right`. The accounts table's chevron cell gains the shared `py-2.5`; its other
  cells already have it, so the row keeps its height (pixel diff below).
- Fixed in review: `"use client"` on the hook as on the other hooks; a comment in the
  account sheet that repeated the hook's doc is gone.
- Left open: the accounts table still has no `data-row`/`moveRowFocus`, although
  Design.md §3.4 lists keyboard navigation for dense tables; that is a behaviour
  change and outside this ticket. The identity `keyOf` (`(id) => id`) is written out
  in the firm and dimension sheets rather than defaulted.
- Gates: lint, typecheck, test (1439 passed, none skipped), build. Browser at 1440 px
  and 390 px (reduced motion at 390) for ledger, econ calendar, strategies, settings
  accounts, journal detail, analytics detail and firm sheet: open, ↓/↑ and Enter on
  the three tables with `data-row`, Esc with the content still shown 120 ms into the
  slide-out (gone at once under reduced motion); no console errors. The same script
  ran on `HEAD` (changes stashed) with identical results, including the settings
  sheet at 390 keeping its content briefly. Pixel diff of 28 screenshots (each page
  and its open sheet, both widths) against `HEAD`: identical, except 4 px behind the
  ledger sheet's backdrop that also differ between two runs of the same code.
