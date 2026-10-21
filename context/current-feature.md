# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress** on `feature/prop-firm-sizes`.

## Feature: Prop firm programs in every account size

- Goal: every currently sold account size of each firm's existing product line is its
  own program, filterable by size, shown as one card per firm. Spec:
  `.scratch/prop-firm-sizes/spec.md`; tickets 01–07 under `.scratch/prop-firm-sizes/issues/`.
- Scope: `PropFirmsData.md` format and data, prop firm parser and seeder, program
  schema (position, numeric account size) with a generated migration, prop firm
  queries, Prop Firm Rules page, program select in account settings, Design.md,
  `project-overview.md` H and Future, `decisions.md`.
- Do not build: other product lines; a discontinued marker; linking without a
  program; the rule detail table or richer compare; a combobox for the program
  select; any change to account rules, rule status or ADR 0001; deleting programs.
- Acceptance: per ticket, the checklist in its file plus the gates and browser checks of
  `ai-interaction.md`.
- Open questions: none.

<!--
For each new task, record:
- Goal: the intended result.
- Scope: affected modules/files and any schema or domain changes.
- Do not build: concrete exclusions for this task.
- Acceptance: observable results and applicable verification from ai-interaction.md.
- Open questions: unresolved requirements; never invent product decisions.
-->
