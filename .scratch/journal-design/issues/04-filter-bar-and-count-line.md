# 04: Slim filter bar and count line

**What to build:** A one-line filter bar replaces the filter card: the Analytics range
presets as chips, from/to dates, the instrument select grouped by asset class, the sort
switch on the right, and "Clear" only while a filter is active. Filters stay in search
params and changing one resets to page 1. Below `sm` the bar folds behind a "Filters"
button showing the number of active filters. Under the bar a quiet count line in the
muted text colour reads like "42 entries · 38 taken · 4 missed" — counts only, no money.
The hidden-practice banner follows directly, unchanged. The page header keeps its
`page-title` on all widths, with Import (calm surface) and New trade (primary) beside it.

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Design.md first: the journal-list section describes the filter bar, its folded form, the count line and the banner's position.
- [x] Prefactor: the range preset list and its type move from the Analytics code to a shared place; Analytics behaves exactly as before. The existing preset-to-range resolution is reused, not copied.
- [x] A preset and typed dates never both apply, as on Analytics; date fields uncontrolled where a preset can clear them.
- [x] Journal query returns taken and missed counts beside the total for the current filters; DB test including a missed setup visible under a selected account.
- [x] Journal links (pagination, sort) carry the range preset forward.
- [x] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: each preset, a custom range, instrument filter, Clear, folded and unfolded bar with the active count, the banner with hidden practice entries; Analytics range filter unchanged; no horizontal scroll; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `0736e91` (uncommitted diff).

- Fixed: chips, sort buttons and Clear were about 32px high; §8 asks for 40px on interactive surfaces. All are `h-10` now — the Analytics chips grow with them, being the same component.
- Fixed: `range=all` or a hand-edited `range=foo` counted as an active filter (Clear and "Filters · 1" with nothing narrowed). `narrowingPreset` in `lib/time.ts`, beside `rangeForPreset`, now decides; it also replaces the unchecked `as RangePreset` casts in both filters, and the `RangePreset` type moved there from the component.
- Fixed: the instrument select lost its visible label (§9 L10); it carries a `cap` label like From and To, and the three line up on a phone.
- Fixed: Design.md §4.16 still said the journal filter needs no `key` remount; it now points to the shared chips and says the journal remounts too.
- Decided at the checkpoint: the spec asked for the count line "in the subtle text colour", which Design.md §8 rules out for values; it stays `--color-fg-muted`, and spec and ticket now say so. The non-wrapping header buttons are kept too.
- Open on purpose: the folded button reads "Filters · 2", the separator the rest of the page uses, not "Filters (2)".
- Open on purpose: the server rule "typed dates win, else the preset" is now written on the journal and the Analytics page; a shared resolver would change the Analytics page beyond the preset prefactor.
- Open on purpose: `JOURNAL_FILTER_KEYS` and `activeJournalFilterCount` name the filter keys separately; three keys, both in one file.
- Open on purpose: the dashboard's "Recent trades" now gets a `missedCount` it does not read; one select shape for every caller, as the comment says.
- Beyond the ticket: Import and New trade do not wrap (`whitespace-nowrap`); before, "New trade" broke onto two lines at 390px.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (70 files, 1180 passed, none skipped), `pnpm build` all exit 0; count tests written red first. Browser: one-line bar on desktop; "30 days" by click → `?range=30d`, 39 entries; typed 01.10.2026 → `?from=2026-10-01`, preset cleared; instrument MES → 8 entries; Clear resets dates and select, keeps `sort=r`; "This month" works; pagination links carry `range` and `sort`; `?range=foo` shows no Clear; every control in the bar ≥ 40px; 390px folded behind "Filters · n", opens in place with aligned fields; no horizontal scroll at 390/640/1024/1400; Analytics presets unchanged in behaviour; no console errors. Not seen: the hidden-practice banner — no practice-only trades in local data; the component is unchanged, only moved below the count line.
