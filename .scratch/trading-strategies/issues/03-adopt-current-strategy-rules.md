# 03: Explicitly adopt current strategy rules on a trade

**What to build:** Let a trader deliberately replace a trade's historical strategy
revision with the current rules of the same strategy. Keep ordinary edits tied to
the historical rules and clear the prior by-the-book assessment when the rule set
changes.

**Blocked by:** 02 — Assign trading strategies and preserve historical rules.

Status: ready-for-agent

## Acceptance

- [ ] Assign a strategy to a trade, then edit the strategy. The trade continues
      to show its historical name and chapters and offers an explicit action to
      adopt the current rules while editing.
- [ ] Use that action, save and reopen: the trade references and displays the
      current revision. Its previous Yes or No by-the-book answer is unanswered.
- [ ] An ordinary save without that action never upgrades the revision or clears
      an answer merely because a newer revision exists.
- [ ] The operation preserves strategy identity, validates ownership server-side
      and does not accept a foreign strategy or revision identifier.
- [ ] Missed setups can adopt current rules while preserving their existing null
      by-the-book state. Assigned imported trades remain protected from import undo.
- [ ] An unchanged revision does not count as a rules change or clear an answer.
- [ ] Extend real Postgres trade-save and public detail-read tests for explicit
      adoption, historical retention, ownership and answer reset; assert persisted
      behaviour rather than only the submitted form payload.
- [ ] Run the required project verification gate. Browser path: assign a strategy,
      answer by the book, edit the strategy, verify the trade still has old rules,
      explicitly adopt current rules, save and inspect the new rules and unanswered
      assessment. Inspect new console errors and record evidence.

## Do not build

- Automatic upgrades, bulk reassignment, revision-history browsing or arbitrary
  selection of older revisions.
- Archive/reactivation controls or strategy analytics.

## Open questions

None. Use the confirmed explicit-adoption semantics.

## Review

Pending implementation and review.
