# 04: Archive and reactivate trading strategies

**What to build:** Let a trader retire a strategy from new assignments and later
reactivate it, while keeping its historical rules readable and retainable on
existing trades. Integrate lifecycle controls into strategy management and enforce
availability in trade assignment on both the client and server.

**Blocked by:** 02 — Assign trading strategies and preserve historical rules.

Status: ready-for-agent

## Acceptance

- [ ] Open strategy management, archive an owned strategy and verify its archived
      state is visible and reactivation is available.
- [ ] An archived strategy is unavailable for new assignments on new or existing
      trades. Server-side validation rejects such assignments even with a crafted
      request; a hidden UI option alone is insufficient.
- [ ] Open a trade already assigned to that strategy: its historical name and
      rules remain readable. Saving unrelated changes retains the assignment,
      historical revision and by-the-book answer.
- [ ] Clearing an archived assignment or switching to an active strategy remains
      possible and follows the existing answer-reset semantics. A cleared archived
      strategy cannot be newly assigned again while archived.
- [ ] Reactivate the strategy and verify it is available for new assignments using
      its current revision; existing historical assignments are unchanged.
- [ ] Archive/reactivation never deletes strategy revisions or trade assignments,
      changes a by-the-book answer by itself or removes import-undo protection.
- [ ] Lifecycle operations verify ownership, including malicious cross-user IDs.
- [ ] Real Postgres lifecycle, public-read and trade-save tests cover archive,
      reactivation, archived retention, rejected new assignments and ownership.
- [ ] Run the required project verification gate. Browser path: assign a strategy,
      archive it, inspect and save the existing trade, check new assignment options,
      reactivate it and assign it again. Inspect new console errors and record
      commands and results.

## Do not build

- Hard deletion, automatic reassignment, bulk lifecycle operations or analytics.
- Explicit revision adoption as a prerequisite; ticket 03 is independent of this
  slice. Preserve its behaviour if it has already been implemented.

## Open questions

None. Archived retention and new-assignment exclusion are confirmed.

## Review

Pending implementation and review.
