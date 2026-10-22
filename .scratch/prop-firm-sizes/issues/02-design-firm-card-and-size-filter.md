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

**Status:** done

- [x] Design.md section for firm card, size control, size chip row and compare header, built from existing tokens and primitives.
- [x] Accessibility stated: size control is keyboard operable with a visible focus ring and an accessible name per size; chips keep `aria-pressed`.
- [x] Empty and edge states stated: firm with one size, firm whose size is unknown, no firm matching.
- [x] Design.md "open" note on Prop Firm Rules updated to what stays open (rule detail table).
- [x] `context/project-overview.md`: Future item narrowed, section H updated; wording approved by the user.
- [x] Documentation-only checks from `context/ai-interaction.md` (accuracy, links, `git diff --check`).

## Review

Two-axis review (standards, spec) of the uncommitted change; fixed before the commit
unless noted.

- Standards: compare paragraph opened with "unchanged" although the header changes → limited to the table body.
- Standards: focus ring referred to "the same pattern as all chips", but the tag chips have none → pinned to §8, tag chips get it with the size group (ticket 04).
- Standards: segments pointed to the tag chips' look, which transition in 150ms against §5's 200ms → 200ms stated.
- Standards: accessible name claimed the program name always contains the visible size label, which only curation guarantees → accessible name is the visible label, the group label names the firm.
- Standards: preselection order, filter semantics and URL state are stated in the spec and in 4.28 → left open on purpose: the rules sit with the component they shape, and the spec is archived in `.scratch/` after the merge.
- Spec: a compared program filtered out of the list was undefined → stays in the compare table.
- Spec: "therefore ascending" stated curator convention as fact → "usually ascending, not enforced".
- Spec: two sizes of one firm in compare left the card's preselection open → the one picked first wins (user decision); spec and ticket 03 updated.
- Spec: section H said "product line" in the singular → "existing product lines" (user decision).
