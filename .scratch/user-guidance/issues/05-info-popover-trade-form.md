# 05: Term explanations — info popover and trade form

**What to build:** A small info icon next to a term opens a popover with its
definition. It opens by click, tap and keyboard (Enter/Space), closes with Escape and
an outside click, and has an accessible label naming the term. The popover is a thin UI
component on the installed `@base-ui/react` popover, in the style of the existing
tooltip; no new dependency. The explanation texts for all eleven terms live in one
constant, worded from `GLOSSARY.md`, and a test asserts each term exists in the
glossary. This ticket places the icon in the trade form: Missed setup, By the book,
Copy trade, Chart clock, R multiple, MFE/MAE.

**Blocked by:** None (can start immediately).

Status: done

## Acceptance

- [x] In the trade form, each of the six terms has an info icon that opens its
      explanation by click, tap and keyboard and closes with Escape.
- [x] The texts match the glossary definitions; a test fails if a term is missing from
      `GLOSSARY.md`.
- [x] Opening an explanation never submits, moves or resets the form.
- [x] Design.md gains a short pattern for the info popover; the popover follows it in
      both themes and at phone width; no new console errors.
- [x] The icons work for the demo user.

## Review

Baseline: HEAD `28e8937`. Two independent axes via the code-review skill.

- Texts: all eleven explanations live in `src/lib/terms.ts`, worded from GLOSSARY.md;
  MFE and MAE share one entry. `src/lib/__tests__/terms.test.ts` reads GLOSSARY.md and
  fails when a named entry is missing (checked by renaming one, then restoring it).
- Standards: a hand-built Base UI popover was replaced by the shadcn primitive
  (`pnpm exec shadcn add popover`, no new package); the generated file passes
  `collisionPadding` through, changed in that one place, so the popover keeps the
  16 px phone gutter. `TermInfo` lives in `src/components/terms/`; the "By the book"
  fieldset is named by its label alone; the icon is 16 px. Kept: the five texts ticket
  06 will use, and `info` as a `ReactNode` slot so form-blocks stays free of terms.
- Spec: the Missed setup icon moved left of the card's check, so its hit area no
  longer covers it; Design.md §3.14 allows the icon on the field a term governs
  (Copy trade on Accounts, Chart clock on Entry time, R multiple on Stop price).
  Kept: icons stay usable while the form is disabled.
- Verification: lint, typecheck, full test suite (1581 passed, none skipped) and build
  pass. Browser as the demo user, never saving: all six icons open by click and by
  Enter/Space in Dark and Light at 1280 px and by tap in Light at 390 px; Escape or an
  outside tap closes them and focus returns to the icon; Enter inside an open popover
  does not move the step (removing the key guard breaks this); date, account and
  "Taken" are kept; a tap on the Missed setup check selects the card; under reduced
  motion the popover appears at once; no horizontal scroll; no console errors beyond
  the known WebGL notice.
