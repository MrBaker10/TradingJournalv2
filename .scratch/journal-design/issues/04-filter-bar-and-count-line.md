# 04: Slim filter bar and count line

**What to build:** A one-line filter bar replaces the filter card: the Analytics range
presets as chips, from/to dates, the instrument select grouped by asset class, the sort
switch on the right, and "Clear" only while a filter is active. Filters stay in search
params and changing one resets to page 1. Below `sm` the bar folds behind a "Filters"
button showing the number of active filters. Under the bar a quiet count line in the
subtle text colour reads like "42 entries · 38 taken · 4 missed" — counts only, no money.
The hidden-practice banner follows directly, unchanged. The page header keeps its
`page-title` on all widths, with Import (calm surface) and New trade (primary) beside it.

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Design.md first: the journal-list section describes the filter bar, its folded form, the count line and the banner's position.
- [ ] Prefactor: the range preset list and its type move from the Analytics code to a shared place; Analytics behaves exactly as before. The existing preset-to-range resolution is reused, not copied.
- [ ] A preset and typed dates never both apply, as on Analytics; date fields uncontrolled where a preset can clear them.
- [ ] Journal query returns taken and missed counts beside the total for the current filters; DB test including a missed setup visible under a selected account.
- [ ] Journal links (pagination, sort) carry the range preset forward.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: each preset, a custom range, instrument filter, Clear, folded and unfolded bar with the active count, the banner with hidden practice entries; Analytics range filter unchanged; no horizontal scroll; no new console errors.
