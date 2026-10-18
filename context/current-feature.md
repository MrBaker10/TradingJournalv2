# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress: mobile-shell, ticket 01** — Branch `feature/mobile-shell`

## Feature: mobile-shell — 01 Top bar and drawer

**Goal.** Below `lg` a slim top bar (page title, menu button) replaces the stacked
sidebar; the menu opens the sidebar content as a drawer. Spec
`.scratch/mobile-shell/spec.md`, ticket `.scratch/mobile-shell/issues/01-top-bar-and-drawer.md`.

**Scope.** Shell components (sidebar split into shared parts, top bar, drawer), app
layout, `context/Design.md` §4.1 and §5. The account selector's menu portals into the
drawer while it is open, so the modal dialog does not make it inert.

### Do not build

- Account selector in the top bar (ticket 02).
- No navigation item changes, no page-level redesign, no gestures, no new dependency.

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
