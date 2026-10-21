# 04: Analytics — recorded dimensions only, masonry, one Avg R note

**What to build:** Analytics shows a card only for dimensions that hold data in the
chosen range and account scope, in one gap-free two-column masonry in today's dimension
order. Dimensions with no rows or only "Not set" are named together in one line "Not
recorded in this range". When no bucket in any dimension has an Avg R, one note above
the tables explains the dash. A dimension with even one set bucket keeps its card.

Spec: `.scratch/progress-analytics-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 03

**Status:** done

- [x] Design.md first: §4.16 describes the masonry, the "Not recorded" line and the Avg R note.
- [x] Recorded vs. not recorded and the Avg R note condition decided in the pure analytics domain module.
- [x] Vitest: all recorded; no rows; only "Not set"; one set bucket beside "Not set" stays recorded; order preserved in both lists; note shown when no bucket has an Avg R, hidden when one has.
- [x] Range filter and account scope behave as today; every figure computed as today.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, desktop and 390px: real data (several dimensions not recorded), a range that changes which dimensions are recorded, cards without holes; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `93da72a`: no hard violations.

- Fixed: the Avg R note showed even when only unrecorded dimensions had rows, so no card showed a dash to explain. `shouldExplainMissingAvgR` now also needs one recorded dimension; a bucket with an R in an unrecorded dimension still suppresses the note, because the sentence would be untrue. Both rules are in Design.md §4.16 and covered by tests.
- Fixed: the empty masonry wrapper is not rendered without a recorded dimension; both notes use the same 11.5px size; the test expectations are written out as literal lists; added the zero-Avg-R case; renamed the predicate from `explainsMissingAvgR`.
- Decision: the Avg R note needs at least one bucket and one recorded dimension; the spec says only "no bucket in any dimension has an Avg R".
- Decision: CSS columns fill column by column, so the order reads down the left column and then the right one, no longer row by row. Spec and Design.md §4.16 say so.
- Open on purpose: `mb-6` on the card wrapper and `gap-6` on the columns put spacing in two places; the column container cannot add row gaps itself.
- Verification: the local data has set buckets in the same five dimensions for every range with trades, so no real range changes which dimensions are recorded. A range without trades (from 2026-10-01) shows no masonry and all eleven dimensions in the line; which dimensions count as recorded in every other combination is covered by the domain tests. "Show all" expanded inside the masonry (By hour): no overlap, cards stay in their columns, no console errors.
