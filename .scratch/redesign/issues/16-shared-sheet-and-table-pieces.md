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

**Status:** needs-triage

- [ ] One hook serves every sheet that keeps its target while it slides out; no copy of the `shown`/`setShown` block remains.
- [ ] The dense tables share their scroll box, header, row and chevron styling from one place; each table keeps only its columns.
- [ ] Nothing changes on screen or by keyboard: rows by ↑/↓ and Enter, Esc, the sheet's slide-out content and reduced motion behave as before.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px for the ledger, econ calendar, strategies, settings accounts, journal detail, analytics detail and firm sheet: open, navigate rows, open a detail, Esc while it slides out; no new console errors.

## Do not build

- Changes to what a sheet or table shows, or to any query.
- A generic table component that takes column definitions; the tables keep their own markup for their columns.
