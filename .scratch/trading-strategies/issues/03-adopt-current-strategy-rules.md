# 03: Explicitly adopt current strategy rules on a trade

**What to build:** Let a trader deliberately replace a trade's historical strategy
revision with the current rules of the same strategy. Keep ordinary edits tied to
the historical rules and clear the prior by-the-book assessment when the rule set
changes.

**Blocked by:** 02 — Assign trading strategies and preserve historical rules.

Status: done

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

### Verification (2026-10-25)

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (77 files, 1306 tests, none skipped, real Postgres), `pnpm build`: passed. Re-run after the review fixes, see below.
- Browser (`/journal/81354`, practice account): assigned "Reversal", answered By the book "Yes", edited the strategy (new entry rule). The trade still showed the old rules and "Yes". Edit form offered "Adopt the current rules of this strategy"; ticked, saved: detail shows the new entry rule, By the book unanswered. No console errors (console tracking started after the first page loads).
- **Not browser-verified:** missed setups and imported trades (DB tests only; the import-undo predicate keys on assignment presence, covered in ticket 02 tests).
- The test trade `/journal/81354` remains in the local dev DB, now on "Reversal" with its current rules.

### Findings

Decided in this ticket:

- Adoption is `adoptCurrentStrategyRules` on the save input, honoured only for the trade's own, unchanged, active strategy; for a switched or cleared strategy it is irrelevant.
- Adopting an archived strategy is rejected with the same message as a new assignment of one (the spec does not say; confirm if you want it allowed).
- Adopting when the stored revision is already current changes nothing and keeps the answer.
- The form hides the option unless a different revision exists, disables By the book while adopting and restores the previous answer when unticked.

Fixed after review: one shared `StrategyOption` type; one name (`adoptCurrentStrategyRules`) end to end; By the book disabled while adopting and its previous value restored.

Left open (judgement calls): `adoptableStrategy` is computed inline in `trade-form.tsx`; the checkbox lacks the Compare checkbox's focus ring and touch target; `resolveStrategyAssignment` takes a positional boolean; no test for an imported trade adopting (the predicate is unaffected).
