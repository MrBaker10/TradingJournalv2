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

**Status:** ready-for-agent

- [ ] Weekly review form uses the form blocks on one page with the same fields, validation and server action as today; week navigation keeps its search parameters; saving confirms "Review saved".
- [ ] The week summary sits beside the form as a mono key/value list; net P&L is shown in neutral colour, not sign colour; process figures use the process colour.
- [ ] Import keeps its flow and its parsing; the file step, mapping, preview table (dense table pattern, scrolls inside its container below `lg`) and result use the new blocks; errors land where they do today; the result reads "Imported n trades" with no P&L.
- [ ] The existing import, review-week and CSV tests still pass unchanged.
- [ ] Old weekly-review and import components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: write and save a review, navigate weeks, import a small CSV through every step; reduced motion emulated once; no new console errors.

## Do not build

- New review questions, import formats or mapping rules.
- A stepped review or a stepped import.
