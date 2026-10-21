# 05: Empty states and the account-filter sentence

**What to build:** The journal distinguishes two calm empty states, each in a
`card-surface edge` without illustration or accent colour. With no filter active and no
entries: "No entries yet." pointing to New trade and Import. With an active filter and
no match: "No entries match these filters." with a "Clear filters" control. The
project overview stops asking for a separate account filter in the journal list: the
shell's account switcher is that filter.

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 04 (defines when a filter counts as active, presets included)

**Status:** done

- [x] Design.md first: the journal-list section describes both empty states.
- [x] Which state shows is decided by the same "filter active" rule as the filter bar's Clear.
- [x] Hidden practice entries with an otherwise empty combined view still show the banner (nothing disappears silently).
- [x] `project-overview.md` corrected: the account switcher is the journal's account filter.
- [x] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: both empty states, Clear filters returns to the list; no horizontal scroll; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `6af2624` (uncommitted diff).

- Fixed: the empty state rebuilt the "clear" overrides that the filter bar's Clear builds too; `CLEARED_JOURNAL_FILTERS` in the journal href module now serves both, so the two cannot drift (§4.27 says they clear the same filters).
- Fixed: the empty-state buttons and the "Filters" toggle had no §8 focus ring; one shared `QUIET_ACTION_CLASS` carries the shell's `focus-visible` ring for all three.
- Fixed: the overview sentence carried a dated rationale; the overview now states the rule only. The rationale goes to `decisions.md` with the round's closing entry.
- Beyond the ticket, kept and written into §4.27: a page past the last one (`?page=99`) redirects to page 1 with the same filters and sort, because otherwise "No entries yet." would sit under a count line with entries.
- Open on purpose: in the combined view with practice-only entries the empty state says "No entries yet." under the banner that names them — as §4.27 specifies.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (70 files, 1180 passed, none skipped), `pnpm build` all exit 0. Browser: `?from=2030-01-01&sort=r&dir=asc` shows "No entries match these filters." in a card; "Clear filters" by click → `?sort=r&dir=asc` with 85 entries; the bar's Clear keeps `sort=r` too; focus ring 2px cyan, offset 2px; `?page=99&sort=r` → `?sort=r` with the list; 390px filtered state with a 40px button, no horizontal scroll; no console errors. Not seen: "No entries yet." and the banner above an empty list — local data has entries and no practice-only trades; reaching either needs a second test user.
