# 11: Ledger

**What to build:** The ledger reads like every other list: a dense table in the
journal's table pattern, a row per entry with mono figures, header and figure cells that
do not wrap, keyboard navigation by row, and a detail sheet where an entry has a
detail. The ledger entry form is built from the trade form's blocks (loose choices,
chips, cards, the same save feedback) on one page rather than in steps. Saving confirms
the action ("Entry saved"), never the amount's sign. The ledger stays separate from
trading P&L as ADR 0002 states.

Spec: `.scratch/redesign/spec.md` → stories 96, 97, 101; Dense table and Form patterns.
Design: `context/Design.md`. No prototype; built from the journal and trade-form
tickets.

**Blocked by:** 05 (Detail sheet and trade detail page), 06 (Trade form in five steps)

**Status:** done

- [x] Ledger entries as a dense table with mono figures in sign colour; header and figure cells do not wrap, the name cell may; ↑/↓ move the focused row and Enter opens it.
- [x] A row opens the medium sheet with the entry's detail; Esc closes it; the sheet uses the row's data.
- [x] The entry form uses the form blocks on one page; the same fields, validation and server action as today; errors land at the field; saving confirms "Entry saved" and offers the next action.
- [x] Money is handled through the existing helpers; no `number` arithmetic.
- [x] Below `lg` the table scrolls horizontally inside its container; the page keeps the 16 px gutter.
- [x] Old ledger components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, navigate rows by keyboard, open a detail, Esc, add an entry, delete an entry with the action confirmed; reduced motion emulated once; no new console errors.

## Do not build

- New ledger fields, categories or totals.
- Mixing ledger figures into trading P&L anywhere.

## Review

- Decided with the user: add, edit and the detail share one medium sheet; "Add entry"
  opens it empty. The open entry is component state, not the URL; nothing links to an
  entry.
- Fixed in review: an edit that moves the entry out of the active filter still shows
  "Entry saved"; a missing category or account focuses its choice (`Choice` sets
  `aria-invalid`); the note keeps its 500-character `maxLength`; the saved state formats
  its date; Delete uses the `destructive` button; the sign rule moved to
  `signedLedgerCents` in `src/domain/ledger.ts` with Vitest; one `runWithToast` with an
  optional success message serves the ledger and strategies.
- Shared blocks changed: `Choice` gained `isOptionDisabled` (a practice account already
  on an entry shows but cannot be picked again) and `aria-invalid`; `TextField` gained
  `maxLength`.
- Left open: `runWithToast` and `SaveButton` stay in `ledger-entry-fields.tsx` until
  ticket 12 rebuilds strategies; the filter bar borrows `SELECT_CLASS` from settings;
  `LedgerEntries` takes the page's header, filters and totals as slots so "Add entry"
  sits in the header; the totals became a mono key/value list beside the filters, same
  three figures.
- Gates: lint, typecheck, test (1434 passed, none skipped), build; browser at 1440 px
  and 390 px (reduced motion): rows by ↑/↓ and Enter, Esc, add with a missing category,
  edit, edit out of a date filter, delete confirmed; 36 checks, no console errors. Every
  entry the run created was found by a DB query and is deleted.
