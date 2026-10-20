# 04: Analytics — recorded dimensions only, masonry, one Avg R note

**What to build:** Analytics shows a card only for dimensions that hold data in the
chosen range and account scope, in one gap-free two-column masonry in today's dimension
order. Dimensions with no rows or only "Not set" are named together in one line "Not
recorded in this range". When no bucket in any dimension has an Avg R, one note above
the tables explains the dash. A dimension with even one set bucket keeps its card.

Spec: `.scratch/progress-analytics-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Design.md first: §4.16 describes the masonry, the "Not recorded" line and the Avg R note.
- [ ] Recorded vs. not recorded and the Avg R note condition decided in the pure analytics domain module.
- [ ] Vitest: all recorded; no rows; only "Not set"; one set bucket beside "Not set" stays recorded; order preserved in both lists; note shown when no bucket has an Avg R, hidden when one has.
- [ ] Range filter and account scope behave as today; every figure computed as today.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: real data (several dimensions not recorded), a range that changes which dimensions are recorded, cards without holes; no new console errors.
