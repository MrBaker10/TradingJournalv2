# 04: Archive and reactivate trading strategies

**What to build:** Let a trader retire a strategy from new assignments and later
reactivate it, while keeping its historical rules readable and retainable on
existing trades. Integrate lifecycle controls into strategy management and enforce
availability in trade assignment on both the client and server.

**Blocked by:** 02 — Assign trading strategies and preserve historical rules.

Status: done

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

### Verification (2026-10-25)

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (77 files, 1314 tests, none skipped, real Postgres), `pnpm build`: passed in the final run.
- Browser (`/strategies`, `/journal/81354` on the practice account, assigned to "Reversal"): archived it (Archived label, Reactivate offered); the trade detail kept name, rules and an Archived tag; the edit form still offered "Reversal · Archived"; an unrelated save with By the book "Yes" kept assignment, rules and answer; the new-trade Strategy select did not list Reversal; after Reactivate it did. No console errors (tracking started after the first page loads).
- **Not browser-verified:** assigning the reactivated strategy to a trade (it would create a trade; covered by DB test: a new assignment gets the current revision), and the import-undo preview (DB test).
- The test trade `/journal/81354` remains in the local dev DB (assigned to "Reversal", By the book Yes).

### Findings

Decided in this ticket:

- One action `setStrategyArchived` with an explicit target state; archive and reactivate are idempotent, archiving twice keeps the first time. A strategy that is not the user's gives the same "no longer exists" error as an unknown one.
- Archive/reactivate only update `trading_strategies.archived_at`; revisions, assignments, answers and import protection are untouched (tested).
- Editing an archived strategy stays possible (appends a revision; no trade changes). The spec is silent; say so if it should be blocked.
- Archived strategies stay in the management list with an "Archived" label.
- The server rules for archived retention and rejected new assignment came with ticket 02 and are now covered by new save tests (switch/clear an archived assignment, no re-assignment while archived, crafted foreign archived id).

Left open (judgement calls):

- `archiveStrategy` and `reactivateStrategy` are near-identical; kept as two functions for readability.
- The buttons share one pending flag, so all rows disable while one request runs.
- `runWithToast` is imported from the ledger module (existing pattern in the strategy form).
- `STRATEGY_SAVE_FAILED` ("Couldn't save the strategy…") is reused for a failed archive change.
