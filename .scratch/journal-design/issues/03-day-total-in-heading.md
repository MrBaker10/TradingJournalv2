# 03: Day total in the day heading

**What to build:** Each day heading shows the day's net P&L on the right, in mono, in
semantic green or red without glow, aligned with the row amounts below. The total covers
the whole day within the active filters, also across a page boundary. It is computed
with the same per-account contribution as the calendar's day totals: copy trades
multiplied by their real accounts exactly once, practice excluded in the combined view,
a selected practice account shown on its own, in the display currency. Without an
instrument filter it equals the calendar's day; with one it covers that instrument only.
A day with only missed setups shows no amount.

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Design.md first: the journal-list section fills in the total's slot (mono, semantic colour, no glow, aligned with the row amounts, absent on missed-only days).
- [ ] Journal query's day values gain the net amount, built from the existing per-account contribution expression — no new money arithmetic, no `number` arithmetic on money.
- [ ] DB tests: copy trade on two real accounts and one practice account; practice-only entry excluded from the combined value; selected practice account; instrument filter narrows the value; without an instrument filter the value equals the dashboard's day total for the same date; missed-only day has no amount.
- [ ] Grouping tests extended: a missed-only day carries no amount.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: totals beside a calendar day on the dashboard agree; a red and a green day; an instrument filter; no horizontal scroll; no new console errors.
