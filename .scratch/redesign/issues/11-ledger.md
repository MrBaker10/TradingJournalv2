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

**Status:** ready-for-agent

- [ ] Ledger entries as a dense table with mono figures in sign colour; header and figure cells do not wrap, the name cell may; ↑/↓ move the focused row and Enter opens it.
- [ ] A row opens the medium sheet with the entry's detail; Esc closes it; the sheet uses the row's data.
- [ ] The entry form uses the form blocks on one page; the same fields, validation and server action as today; errors land at the field; saving confirms "Entry saved" and offers the next action.
- [ ] Money is handled through the existing helpers; no `number` arithmetic.
- [ ] Below `lg` the table scrolls horizontally inside its container; the page keeps the 16 px gutter.
- [ ] Old ledger components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, navigate rows by keyboard, open a detail, Esc, add an entry, delete an entry with the action confirmed; reduced motion emulated once; no new console errors.

## Do not build

- New ledger fields, categories or totals.
- Mixing ledger figures into trading P&L anywhere.
