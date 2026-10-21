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

**Status:** done

- [x] Design.md first: §4.3 gains the compact status card (cap label, mono value with glow and sub-line on one row, no icon tile) as a documented small form; the dashboard tiles stay unchanged. §4.4 places the grace-day bar full width outside the streak card.
- [x] Grace-day bar and streak rules leave the streak card; rules wording unchanged.
- [x] No consistency tile on Progress; the breakdown card carries the score.
- [x] Unlocked-badge card stays where it is today.
- [x] Every figure computed exactly as today; no query changes.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, desktop and 390px: with and without a grace day, an empty and a filled month (consistency score), rules disclosure open and closed; no horizontal scroll; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `8a11aeb`.

- Fixed: the open streak rules sat in an undocumented `card-surface edge` card; Design.md §4.4 now names that surface.
- Open on purpose: the status-card sub-line is 11.5px in `--color-fg-subtle`, below the 12px floor of Design.md §8. It copies the dashboard tile (§4.3), which has the same gap; fixing one without the other would split the two forms.
- Open on purpose: `StreakExplanation` wraps the score grid as children, because the grace-bar chevron and the rules share open state and the cards stay server-rendered. The header comment says so.
- Open, predates this ticket: `aria-controls="streak-rules"` points at an element that exists only while the rules are open.
- Beyond the spec, documented in §4.4: the grace-bar chevron scrolls to the rules, which now sit below the score grid.
- Verification: the filled month and the state without a grace day were checked by forcing the page props locally and reverting them; the local database has no October entries.
