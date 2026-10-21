# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress** on `feature/journal-design`.

## Feature: Design round Journal

- Goal: the journal list reads by trade date with a calm filter bar, a count line, a
  clear row hierarchy and two empty states. Spec: `.scratch/journal-design/spec.md`;
  tickets 01–05 under `.scratch/journal-design/issues/`.
- Scope: `/journal` list, the shared trade row (also "Recent trades" on the dashboard),
  the journal list query (taken/missed counts, per-date day values), Design.md §4.9 and
  a new journal-list section, one sentence in `project-overview.md`.
- Do not build: changes to trade detail, edit or import; a money total for the filtered
  range; a separate account filter on the page; new filters or page sizes; hiding the
  page title below `lg`; schema changes or migrations.
- Acceptance: per ticket, the checklist in its file plus the gates and browser checks of
  `ai-interaction.md` on desktop and at 390px.
- Open questions: none.
