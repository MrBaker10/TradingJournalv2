# 01: Manage the checklist template in Settings

**What to build:** A checklist template section in Settings where a trader maintains
their routine steps in three fixed phases — pre-market, trading and day review. Steps
can be added, renamed and deleted. Limits are enforced on the server and reported at
the field. This slice establishes the template as user-owned data; the dashboard and
reordering follow in later tickets.

**Blocked by:** None (can start immediately).

Status: ready-for-agent

## Acceptance

- [ ] Settings shows a checklist template section with all three phases, each with an
      empty state and an add action.
- [ ] Add steps to every phase, rename one and delete one; reload and verify the
      template is persisted in insertion order per phase.
- [ ] Text is trimmed; empty text and text over 120 characters are rejected with a
      message at the field. A 21st step in a phase is rejected with a clear message.
- [ ] Template reads and writes are owned by the user: another user's supplied item
      IDs can neither be read, renamed nor deleted. Deleting a user deletes their
      template.
- [ ] Real Postgres tests through the new query module cover add, rename, delete,
      limits, ownership and cascade using the established rollback-fixture approach
      (prior art: weekly-reviews and strategies query tests).
- [ ] Run the required project verification gate. In the browser, edit the template
      in Settings, including phone width and keyboard use, and inspect the console for
      new errors. Record commands and results during implementation.

## Do not build

- The dashboard card, ticking or daily checks; these belong to ticket 02.
- Reordering; this belongs to ticket 03.
- Example or preset steps, multiple templates, links to strategies or trades.
- New dependencies or unrelated refactors.
