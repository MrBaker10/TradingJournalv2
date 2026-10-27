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

**Status:** ready-for-agent

- [ ] Econ Calendar as a dense table of the stored events in the user's timezone; a row opens the medium sheet with the event's detail; the existing filters keep their search parameters.
- [ ] Strategies as a dense table; a row opens the sheet with the strategy's detail; editing uses the form blocks on one page, keeps the existing validation and the rule in ADR 0003, and confirms the action.
- [ ] ↑/↓ move the focused row and Enter opens it in both tables; Esc closes the sheet; key handling inside the sheet is bound on the sheet.
- [ ] Below `lg` both tables scroll horizontally inside their container; the pages keep the 16 px gutter.
- [ ] Empty states explain the rule that makes them empty (no events fetched yet, no strategy created yet).
- [ ] Old econ and strategies components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px for both pages: open, navigate rows, open a detail, Esc, filter events, add and edit a strategy; reduced motion emulated once; no new console errors.

## Do not build

- Changes to the econ feed, fetch or parse.
- New strategy fields or assignment behaviour.
