# 01: Progress — score first

**What to build:** Progress follows prototype variant B. The grace-day notice runs across
the full width above everything. Below it, from `lg`, two columns at 3 : 2: the month's
consistency score with its breakdown as the main card on the left; on the right a column
of compact status cards for the logging streak and the badge count, then the
weekly-review card. The streak rules sit underneath as a closed disclosure. Past months
and badges follow. Below `lg` one column with the score card first. The score appears
once on the page.

Spec: `.scratch/progress-analytics-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Design.md first: §4.3 gains the compact status card (cap label, mono value with glow and sub-line on one row, no icon tile) as a documented small form; the dashboard tiles stay unchanged. §4.4 places the grace-day bar full width outside the streak card.
- [ ] Grace-day bar and streak rules leave the streak card; rules wording unchanged.
- [ ] No consistency tile on Progress; the breakdown card carries the score.
- [ ] Unlocked-badge card stays where it is today.
- [ ] Every figure computed exactly as today; no query changes.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: with and without a grace day, an empty and a filled month (consistency score), rules disclosure open and closed; no horizontal scroll; no new console errors.
