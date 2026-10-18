# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress: mobile-shell, ticket 02** (01 done) — Branch `feature/mobile-shell`

## Feature: mobile-shell — 02 Account selector in the top bar

**Goal.** Below `lg` the account selector sits in the top bar, always visible, with the
practice stripe on the bar; the drawer no longer holds it. Spec
`.scratch/mobile-shell/spec.md`, ticket `.scratch/mobile-shell/issues/02-account-selector-in-top-bar.md`.

**Scope.** Account selector placement variant (top bar: opens downward, right-aligned,
kept on screen), sidebar content slot for the selector, mobile shell, `context/Design.md`
§4.1 and §4.12. The ticket-01 portal into the drawer dialog is no longer needed.

### Do not build

- No change to how selection is stored or which accounts are offered.
- No navigation item changes, no page-level redesign, no new dependency.

### Acceptance

See the ticket's checklist.

### Open questions

None.

<!--
For each new task, record:
- Goal: the intended result.
- Scope: affected modules/files and any schema or domain changes.
- Do not build: concrete exclusions for this task.
- Acceptance: observable results and applicable verification from ai-interaction.md.
- Open questions: unresolved requirements; never invent product decisions.
-->
