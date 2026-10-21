# 01: Trade row with a clear hierarchy

**What to build:** Every trade row, in the journal and in "Recent trades" on the
dashboard, reads with a clear hierarchy. The title line shows the symbol and the
direction as muted text (`MNQ · Short`). Chips remain only for missed, grade and the
confluence count; the win/loss chip is gone, so the amount's colour and R are the only
result signal. Below `sm` the title line shows only symbol, direction and the missed
chip; every row stays two lines high and the amount is never cut off. Missed setups stay
built exactly like taken trades apart from the tile colour and the missed chip.

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Design.md first: §4.9 describes the new title line, the chips that remain, the removed result chip (gross label beside a net amount) and the narrow-screen form.
- [ ] Direction as text after the symbol, not a chip; result chip removed.
- [ ] Grade and confluence count hidden below `sm`; missed chip always visible.
- [ ] Amount and R column unchanged; would-be R for missed setups unchanged.
- [ ] Meta line unchanged in this ticket (date first).
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px, journal and dashboard "Recent trades": taken win, taken loss, missed setup, a row with grade and confluences, a long CFD symbol; no horizontal scroll; no new console errors.
