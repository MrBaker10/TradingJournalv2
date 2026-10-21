# 02: Design the firm card and size filter

**What to build:** `context/Design.md` describes, at component level, how the Prop Firm
Rules page shows programs in several sizes: the firm card (collapsed: firm, product
line, size control, the selected program's summary tags, "Last verified", website
link; expanded: the eighteen fields of the selected size), the size control itself,
the "Size" chip row beside search and tag chips, and the compare column header
"Firm · Program". It uses existing tokens and primitives, dark only, no glow on rule
values, and states focus, keyboard and reduced-motion behaviour. The Future item
"Component-level design for Prop Firm Rules" in `context/project-overview.md` is
narrowed to what remains (rule detail table, richer compare), and section H mentions
programs per account size.

Spec: `.scratch/prop-firm-sizes/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Design.md section for firm card, size control, size chip row and compare header, built from existing tokens and primitives.
- [ ] Accessibility stated: size control is keyboard operable with a visible focus ring and an accessible name per size; chips keep `aria-pressed`.
- [ ] Empty and edge states stated: firm with one size, firm whose size is unknown, no firm matching.
- [ ] Design.md "open" note on Prop Firm Rules updated to what stays open (rule detail table).
- [ ] `context/project-overview.md`: Future item narrowed, section H updated; wording approved by the user.
- [ ] Documentation-only checks from `context/ai-interaction.md` (accuracy, links, `git diff --check`).

## Review
