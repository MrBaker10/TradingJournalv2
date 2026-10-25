# 01: Create, read and edit private trading strategies

**What to build:** A dedicated strategy-management page where a trader can create,
read and edit multiple private trading strategies. Each strategy has a required
name and optional plain-text chapters for prerequisites, entry, stop/risk, exit
and exclusion criteria. Changes preserve earlier rule sets as immutable strategy
revisions, establishing the approved historical-rules model from the first slice.

**Blocked by:** None (can start immediately).

Status: ready-for-agent

## Acceptance

- [ ] Application navigation opens strategy management, including an empty state
      with a clear create action.
- [ ] Create a strategy using only a name, save, reload and read it successfully.
      A blank name is rejected using the existing validation conventions.
- [ ] Create a second strategy and verify both appear in the owner's list.
- [ ] Add and edit all five optional chapters, save and reopen; text is preserved
      and rendered as plain text.
- [ ] Editing the name or chapters creates a new rule set without mutating prior
      revisions. Strategy identity, owner and archive state are separate from
      revision content, following the approved architecture.
- [ ] Public lifecycle operations and reads enforce ownership. Unauthenticated
      access and another user's supplied identifiers cannot expose or mutate data.
- [ ] Real Postgres tests through lifecycle interfaces and public reads cover
      creation, optional content, edits, immutable history and ownership using the
      established rollback-fixture approach.
- [ ] Run the required project verification gate. In the browser, navigate to
      strategy management, create two strategies, edit and reopen one, and inspect
      the console for new errors. Record commands and results during implementation.

## Do not build

- Trade assignment, explicit revision adoption or archive/reactivation controls;
  these belong to subsequent tickets.
- Strategy analytics, filters, sharing, rich text, automatic evaluation or scoring.
- New dependencies or unrelated refactors.

## Open questions

None. Use the confirmed spec and ADR for terminology, scope and revision semantics.

## Review

Pending implementation and review.
