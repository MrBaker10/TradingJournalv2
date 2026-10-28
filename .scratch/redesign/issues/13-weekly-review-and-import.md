# 13: Weekly review and import

**What to build:** The weekly review and the import flow answer the same way as the
trade form. The weekly review is a form built from the trade form's blocks on one page,
with the week's summary beside it as a mono key/value list in which net P&L is a neutral
figure; saving confirms "Review saved" and feeds the process moment on Progress as
today. The import flow keeps its existing steps and behaviour (file, mapping, preview,
result) in the form blocks and confirms the action with the count ("Imported 12
trades"); broker time is still converted once at the file boundary.

Spec: `.scratch/redesign/spec.md` → stories 97, 100, 101; Form and Feedback patterns.
Design: `context/Design.md`. No prototype; built from the trade-form ticket.

**Blocked by:** 06 (Trade form in five steps)

**Status:** done

- [x] Weekly review form uses the form blocks on one page with the same fields, validation and server action as today; week navigation keeps its search parameters; saving confirms "Review saved".
- [x] The week summary sits beside the form as a mono key/value list; net P&L is shown in neutral colour, not sign colour; process figures use the process colour.
- [x] Import keeps its flow and its parsing; the file step, mapping, preview table (dense table pattern, scrolls inside its container below `lg`) and result use the new blocks; errors land where they do today; the result reads "Imported n trades" with no P&L.
- [x] The existing import, review-week and CSV tests still pass unchanged.
- [x] Old weekly-review and import components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: write and save a review, navigate weeks, import a small CSV through every step; reduced motion emulated once; no new console errors.

## Do not build

- New review questions, import formats or mapping rules.
- A stepped review or a stepped import.

## Review

- The ticket's "mapping" step is the existing account step: the flow stays File,
  Account, Preview, Result. Picking an account is the trade form's loose choice and
  runs the preview at once, as before; real accounts come first, the practice account
  carries the amber stripe and a badge and is never preselected.
- "Imported n trades" counts new and updated rows, as the confirm button always did;
  a file whose rows were all in the journal reads "Imported 0 trades" with "13
  skipped" under it. The result uses the trade form's drawn check, no P&L.
- The weekly review saves with the button holding "Saved" for 1.5 s and the toast
  "Review saved" (Design.md §3.11, as the account editor); the action, the fields and
  the `week` parameter are unchanged. The summary is a `MetricRow` list: process
  figures in `process`, net P&L without tone.
- Fixed in review: undoing an import now confirms "Removed n trades" (story 101); the
  import's error line keeps its slot and is a polite live region (`StepError`), so
  nothing shifts; only the result's heading is announced, not its buttons; the
  summary's hard-coded id is gone; an extra empty-state sentence was dropped.
- Removed: `MetricCell` and its `--shadow-metric-cell` token, whose last use was the
  weekly review summary (ticket 03 had kept it for Ledger and Progress).
- Left open: the preview table keeps the ledger's left-aligned, muted date column, and
  muted secondary figures (entry time, skip verdict, the result's counts) as the other
  dense tables do. The "Saved" hold of the button is copied from the account editor;
  ticket 16 is where shared form pieces would go. The amber stripe on the account
  choice is a span inside `Choice`, since `Choice` takes no per-option class.
- Gates: lint, typecheck, test (1439 passed, none skipped; the import, review-week and
  CSV tests unchanged), build; browser at 1440 px and 390 px (reduced motion at 390):
  previous week by the stepper and an open week from the strip, save a review with
  "Saved" and "Review saved", net P&L neutral, import of a Tradovate fills fixture
  through file, account, preview (13 rows) and "Imported 13 trades", a repeat
  "Imported 0 trades", undo confirmed "Removed 13 trades"; no horizontal page scroll,
  no console errors. Every review, batch and trade the runs created was found by a DB
  query on `created_at` and is deleted; undo picked its batch by a filename unique to
  the run, never by list order.
