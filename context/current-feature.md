# Current Feature

Working file with a short lifespan. It holds what is being built **right now** and
nothing else. Durable decisions belong in `project-overview.md`,
`project-structure.md` and `coding-standards.md`.

Rewrite the Feature block for every new piece of work. Append one line to History when
it is done and merged.

Two different lists, do not mix them up:

- **Not Building** in `project-overview.md` — permanent scope limits for the whole
  project.
- **Do not build** below — the local fence for the feature in progress. Things that are
  in scope eventually, but explicitly out of scope for this branch.

---

## Status

**Nothing in progress.**

### Phase 0 — before the first line of code

- [x] `context/Design.md` written and agreed
- [x] `PropFirmsData.md` cleaned up: 15 headings now parse as `## Name`, the four
      nameless blocks (BluSky, Legends Trading, TradeDay, The Trading Pit) carry their
      name in the heading. Rest of the file byte-identical. Website URLs and
      `last_verified_at` are still absent from the file — open, blocks S11 only.
- [x] P0.2 Scaffold the project and reconcile the command list in `CLAUDE.md` with the
      real `package.json`

---

## Feature: _(none)_

<!--
Filled by `/feature load <description>`. Shape:

**Goal.** One or two sentences: what the user can do afterward that they could not
before.

**Scope.** Files and modules touched, new tables and migrations, new domain modules
with their tests.

### Do not build
At least two concrete, neighbouring-scope exclusions.

### Acceptance
Browser-checkable checkboxes, including the four gates and one explicit click path.

### Open questions
Leave empty, or list what the spec does not decide.
-->

---

## History

One line per merged feature. Newest at the top.

| Date | Feature | Notes |
| --- | --- | --- |
| 2026-09-09 | P0.2 — Scaffold und Toolchain | Next 16.3.4 Scaffold, exakte Pins, Biome/Vitest/tsconfig, `CLAUDE.md`-Befehlsliste um P0.2-Abweichung ergänzt. `next.config.ts` nach Review um nicht-autorisiertes `agentRules: false` bereinigt. |
| — | — | Nothing merged yet |
