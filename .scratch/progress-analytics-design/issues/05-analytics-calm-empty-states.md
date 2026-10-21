# 05: Analytics — calm empty states, missed setups in a card, no charts

**What to build:** An execution section with nothing recorded shows one compact line
saying why, instead of its empty cards; sections with data look as today. The missed
setups sit in a card like every other section, empty state included. Design.md closes
the open Progress and Analytics items and records that Analytics keeps the value bar and
gets no charts.

Spec: `.scratch/progress-analytics-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 03

**Status:** done

- [x] Design.md first: §4.17 describes the compact empty line; §4.16 the missed-setups card; §10 marks Progress and Analytics as designed in this round and the bar-chart question as decided ("kein Diagramm").
- [x] Risk calibration gets a label line below `sm` ("Trades · Share") so its two-line rows are labelled; desktop stays as today (no header). Added 2026-10-21 after the real-data check of ticket 03.
- [x] Explanatory empty texts kept (why a section is empty), only their surface shrinks.
- [x] Missed setups still carry no money figure.
- [x] Roadmap Future entry for component-level design names only Prop Firm Rules afterwards.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, desktop and 390px: empty risk calibration and exit efficiency, hold time with data, missed setups empty and filled if data allows; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `23c0c3a`: no code defects.

- Fixed: Design.md still pointed at a caveat "same as 4.16" that §4.16 no longer carries. §4.17 now says it was designed in this round; §4.18, §4.19 and §4.21 say only "Gebaut, nicht entworfen."; §4.23 to §4.26 were reworded earlier in this ticket.
- Fixed: comment indentation in `exit-efficiency-card.tsx`.
- Decision: an empty section drops its description under the heading and keeps the reason; Risk calibration collapses only when none of its four cards has a bucket, with any data the empty cards stay because the gap is the finding. Both are in Design.md §4.17.
- Decision: Missed setups uses the same one-line surface when empty; with data it is unchanged (four cards, no money figure).
- Added at the user's request: Risk calibration shows a "Trades · Share" label line below `sm` (`BucketHeader narrowOnly`); desktop stays without header.
- Open on purpose: `EmptySection` (`edge`) and the empty "Past months" line in `score-history.tsx` (`edge-neon`) share their markup. They live in two folders and differ in the edge, so I left them separate.
- Open on purpose: `RiskCalibrationCard` calls `buildExcursionRows` for the collapse check and each card calls it again; the cost is trivial.
- Verification: all four sections empty checked for September 2026 and for a range from 2026-11-01 (account scope Apex); a mix of empty and filled sections was not seen. With data: Hold time, Risk calibration, Exit efficiency and the four missed-setups cards on desktop; Risk calibration label line, no horizontal scroll and no errors at 390px. Not checked at 390px with data: Exit efficiency and the filled missed setups (markup unchanged by this ticket).
