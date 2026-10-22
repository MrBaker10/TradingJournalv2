# 03: One card per firm with a size control

**What to build:** The Prop Firm Rules page shows one card per prop firm instead of one
per program. A size control on the card switches between the firm's programs; the
collapsed card shows firm, product line, size control, the selected program's summary
tags, "Last verified" and the website link, and expanding it shows the eighteen fields
of the selected size. The card opens on the program of that firm in the compare
selection if there is one, else on the smallest size, else on the first program by
position. The size choice is local to the card, not in the URL. The card's compare
action adds the selected program, so two sizes of one firm can be compared side by
side; each compare column is headed "Firm · Program". Search and tag chips keep
filtering programs, and a firm card appears when at least one of its programs matches.

Spec: `.scratch/prop-firm-sizes/spec.md`. Terms: `GLOSSARY.md`. Design: the section
written in ticket 02.

**Blocked by:** 01 (Firm blocks with several programs), 02 (Design the firm card and size filter)

**Status:** ready-for-agent

- [ ] Pure page-logic module groups filtered program rows into firm cards in firm order, programs in position order, and picks the preselected program (compare, the first picked if several → smallest size → first by position).
- [ ] Firm card per Design.md: size control, selected program's tags, "Last verified", website, expandable eighteen fields; unknown fields shown as unknown.
- [ ] A firm with a single program still shows its card correctly per Design.md.
- [ ] Compare targets the selected program; two sizes of one firm can be compared; cap of three unchanged; column header "Firm · Program".
- [ ] Unit tests for grouping and preselection (Seam 3), with multi-size fixtures.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser (with a local multi-size fixture firm or seeded data): switch sizes, expand, compare two sizes of one firm, reload keeps compare; keyboard operation of the size control; no new console errors.

## Review
