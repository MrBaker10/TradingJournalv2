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

Status: ready-for-agent

## Acceptance

- [ ] In the trade form, each of the six terms has an info icon that opens its
      explanation by click, tap and keyboard and closes with Escape.
- [ ] The texts match the glossary definitions; a test fails if a term is missing from
      `GLOSSARY.md`.
- [ ] Opening an explanation never submits, moves or resets the form.
- [ ] Design.md gains a short pattern for the info popover; the popover follows it in
      both themes and at phone width; no new console errors.
- [ ] The icons work for the demo user.
