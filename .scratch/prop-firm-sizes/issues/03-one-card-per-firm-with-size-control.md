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

**Status:** done

- [x] Pure page-logic module groups filtered program rows into firm cards in firm order, programs in position order, and picks the preselected program (compare, the first picked if several → smallest size → first by position).
- [x] Firm card per Design.md: size control, selected program's tags, "Last verified", website, expandable eighteen fields; unknown fields shown as unknown.
- [x] A firm with a single program still shows its card correctly per Design.md.
- [x] Compare targets the selected program; two sizes of one firm can be compared; cap of three unchanged; column header "Firm · Program".
- [x] Unit tests for grouping and preselection (Seam 3), with multi-size fixtures.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser (with a local multi-size fixture firm or seeded data): switch sizes, expand, compare two sizes of one firm, reload keeps compare; keyboard operation of the size control; no new console errors.

## Review

Two-axis review (standards, spec) of the uncommitted change; fixed before the commit
unless noted.

- Standards: the "50k" formatter was money formatting outside `src/lib/money.ts` → moved there as `formatCentsThousands`, with its own tests.
- Standards: `preselect` narrowed with `as number`, and grouping pushed a `preselectedId: 0` placeholder → local `number`, group first, then map to cards.
- Standards: Design.md asked for `role="group"`, Biome asks for the semantic `fieldset` → kept `fieldset`, Design.md wording follows the code.
- Spec: Design.md said "halbfett" for the firm name, card and compare use `font-medium` → Design.md says `font-medium`.
- Standards: the card's `?? programs[0]` can never run → left: without it the type is `| undefined`, and Biome refuses a non-null assertion.
- Standards: cents leave Postgres as `::int` typed `number`, where the ledger uses `::bigint` typed `string` and maps it → left: one shared selection serves two queries, int4 holds sizes up to $21M, the comment says so.
- Standards: `CardRow` and the `sizeLabels` parameter are structural shapes, not `Pick<PropFirmRow…>` → left: they keep the pure module and its fixtures independent of the query's eighteen fields.
- Spec: the single-filtered-size preselection is missing → belongs to ticket 04.
