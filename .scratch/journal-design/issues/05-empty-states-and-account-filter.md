# 05: Empty states and the account-filter sentence

**What to build:** The journal distinguishes two calm empty states, each in a
`card-surface edge` without illustration or accent colour. With no filter active and no
entries: "No entries yet." pointing to New trade and Import. With an active filter and
no match: "No entries match these filters." with a "Clear filters" control. The
project overview stops asking for a separate account filter in the journal list: the
shell's account switcher is that filter.

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 04 (defines when a filter counts as active, presets included)

**Status:** ready-for-agent

- [ ] Design.md first: the journal-list section describes both empty states.
- [ ] Which state shows is decided by the same "filter active" rule as the filter bar's Clear.
- [ ] Hidden practice entries with an otherwise empty combined view still show the banner (nothing disappears silently).
- [ ] `project-overview.md` corrected: the account switcher is the journal's account filter.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: both empty states, Clear filters returns to the list; no horizontal scroll; no new console errors.
