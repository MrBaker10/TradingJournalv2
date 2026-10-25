# Private trading strategies

Status: done

## Problem Statement

Traders cannot currently record reusable trading strategies in the journal or
identify which rules applied to a trade. Setup type, entry model and confluences
describe aspects of a trade, while the pre-market plan describes a particular day.
Neither captures a reusable strategy. Changing a strategy later must not change
the meaning of an earlier by-the-book assessment.

## Solution

Provide a dedicated page where each user can maintain multiple private trading
strategies. Each strategy has a required name and optional plain-text chapters:
prerequisites, entry, stop/risk, exit and exclusion criteria.

Allow an optional strategy on each trade or missed setup. Preserve the rule set
assigned to that trade, even when the strategy changes. Let the user explicitly
adopt the current rules. Keep by-the-book assessment manual and clear an existing
answer when its strategy context changes. Archive strategies instead of deleting
their history, and allow reactivation.

## User Stories

1. As a trader, I want to create multiple private strategies, so that I can record distinct trading approaches.
2. As a trader, I want to start with just a name, so that I can develop my rules gradually.
3. As a trader, I want optional chapters for prerequisites, entry, stop/risk, exit and exclusion criteria, so that my rules are easy to find.
4. As a trader, I want to list and read my strategies on a dedicated page, so that I can consult them before trading.
5. As a trader, I want to edit a strategy, so that future assignments use my improved rules.
6. As a trader, I want existing trades to retain their assigned name and rules, so that historical reviews remain meaningful.
7. As a trader, I want to archive a strategy, so that it no longer appears as a choice for new assignments.
8. As a trader, I want archived strategies to remain visible on assigned trades, so that I retain historical context.
9. As a trader, I want to reactivate a strategy, so that I can use it again.
10. As a trader, I want to select at most one strategy when creating or editing a trade, so that its governing rules are clear.
11. As a trader, I want to leave strategy assignment empty, so that journaling does not depend on having written a strategy.
12. As a trader, I want to assign a strategy to a missed setup, so that I can record the approach behind an opportunity I did not take.
13. As a trader, I want existing and newly imported trades to have no inferred strategy, so that assignments remain my decision.
14. As a trader, I want to assign a strategy to an imported trade later, so that I can enrich imported records.
15. As a trader, I want new assignments to use the current rules even on backfilled trades, so that assignment has one predictable meaning.
16. As a trader, I want ordinary trade edits to preserve the assigned revision, so that unrelated saves do not change my historical rules.
17. As a trader, I want to explicitly adopt the current rules on an assigned trade, so that I control revision changes.
18. As a trader, I want to switch or clear an assignment, so that I can correct my journal.
19. As a trader, I want assignment changes to clear my previous by-the-book answer, so that an assessment of different rules is not silently reused.
20. As a trader, I want to answer by the book manually against the assigned rules, or my general rules without a strategy, so that the answer reflects my judgment.
21. As a trader, I want an unchanged assignment to preserve my answer during ordinary saves, so that editing unrelated details does not erase my review.
22. As a trader, I want setup type, entry model and confluences to remain available, so that a strategy complements my existing classifications.
23. As a trader, I want strategy assignments to protect imported trades from import undo, so that manual enrichment is not lost.
24. As a trader, I want clearing the last manual enrichment to restore import-undo eligibility, so that undo follows the existing content-based rules.
25. As a trader, I want my strategy data and assignments to be accessible only to me, so that my trading process remains private.

## Implementation Decisions

- Reuse the installed stack, existing form controls and shared Zod validation.
  No new dependency is required. Strategy content is plain text.
- Separate strategy identity, ownership and archive state from immutable strategy
  revisions. A revision contains the name and all chapters. Each trade has an
  optional reference to one revision. Strategies belong to a user, not an account.
- Create strategy revisions atomically with lifecycle changes as appropriate.
  Editing rules must never mutate an already assigned revision. Preserve the
  historical name as well as the chapters in trade reads.
- Add strategy lifecycle operations and public reads following the existing
  application/query boundaries. Resolve the current user at application entry
  points and verify ownership of every supplied strategy, revision and trade ID.
- Extend the existing trade-save boundary and trade-detail reads. Server-side
  validation must enforce optional single assignment and the active-strategy rule;
  hiding archived options in the UI alone is insufficient.
- Keep an already assigned archived strategy readable and retainable on an
  ordinary save. Do not allow an archived strategy to be newly assigned.
- New assignments resolve to the current revision, including for older trades.
  Keeping an assignment preserves its revision. Adopting current rules is a
  distinct explicit operation, not an implicit effect of saving.
- Assigning, switching, clearing or adopting a different revision resets an
  existing by-the-book answer to unanswered. A strategy change must not silently
  retain or supply a Yes/No answer. An unchanged assignment preserves the normal
  manual assessment behaviour. Missed setups continue to have no such assessment.
- Add assignment presence to the existing content-based import-undo protection
  predicate, shared by preview counts and actual removal. Clearing assignment
  restores eligibility only when no other manual enrichment remains.
- Provide strategy management navigation and create/read/edit/archive/reactivate
  flows. Show the assigned rules on trade details and provide selection, clearing
  and explicit adoption of current rules while editing.
- Preserve existing money, account scope, scoring, time and trade-classification
  rules. Strategy assignment itself introduces no new scoring contribution.

## Testing Decisions

- Test externally observable behaviour through the highest practical existing
  application interfaces and public queries; avoid tests coupled to table layout
  or component internals.
- Exercise strategy lifecycle operations and reads using real Postgres rollback
  fixtures: creation, optional chapters, editing, historical revision preservation,
  archive/reactivation and rejection of cross-user reads or mutations.
- Extend the existing trade-save tests and public trade-detail query tests for
  taken trades, missed setups and imported trades. Cover empty assignment, current
  revision on assignment, unchanged historical revision, explicit update, switching,
  clearing, archived retention and rejected new archived/cross-user assignments.
- Verify the by-the-book transition matrix: Yes, No and unanswered remain correct
  on unchanged assignments; changes clear an existing answer; missed setups retain
  their existing null behaviour. Read persisted results rather than inspecting only
  a form payload.
- Extend existing import-query tests to verify identical preview/removal decisions:
  assigned trades survive undo; clearing assignment permits removal only without
  other enrichment. No strategy is inferred during import.
- Browser checks cover management and the complete trade interaction. Database
  tests establish persistence and ownership; they do not replace rendered-form
  checks. Inspect new console errors during affected flows.
- Follow the project's ordered verification gate for application changes. Relevant
  database tests must execute; skipped database cases are not passing evidence.

## Acceptance

1. Open strategy management from the application navigation, create a strategy
   with only a name, then add chapters. Create another strategy and verify both
   are available only to the owning user.
2. Open a new trade, confirm no strategy is preselected, select one, save, and
   verify its name and rules on the detail page. Repeat assignment for a missed
   setup and an existing imported trade.
3. Edit the assigned strategy, reopen the original trade, and verify its old name
   and rules remain. Save an unrelated trade edit and verify the revision and
   by-the-book answer remain unchanged.
4. Explicitly adopt current rules and verify the new rules and unanswered
   by-the-book state. Verify switching and clearing assignments also clear an
   existing answer, while the user can still manually assess unchanged rules.
5. Archive an assigned strategy. Verify its historical rules remain readable and
   retainable on existing trades, but it cannot be newly assigned. Reactivate it
   and verify it becomes available again.
6. Open an import's undo preview before and after assigning a strategy. Verify the
   enriched trade is protected and the preview agrees with actual undo. Verify
   clearing assignment restores eligibility only if no other enrichment remains.

## Out of Scope

### Do not build

- Strategy filters, performance breakdowns or other strategy-specific analytics.
- Multiple simultaneous strategies on a trade.
- A daily personal rulebook, daily adherence tracking or changes to scoring rules.
- Automatic strategy assignment, inferred by-the-book answers or rule evaluation.
- Sharing, public strategies, automated trading, signals, suggestions or AI features.
- Rich-text editing, attachments or a replacement for the daily pre-market plan.
- Hard deletion of strategies or rewriting historical assignments after an edit.
- Replacements for setup type, entry model or confluences.

## Open Questions

None. Product behaviour, revision architecture and test boundaries were confirmed
in clarification rounds Q1–Q13.

## Further Notes

- Clarification record: [discovery.md](discovery.md).
- Domain vocabulary: [GLOSSARY.md](../../GLOSSARY.md).
- Historical-rules decision: [ADR 0003](../../docs/adr/0003-preserve-assigned-strategy-rules.md).
- Implementation branch: `feature/trading-strategies`.
- Follow the ticket workflow: one ticket at a time, code and verification, review,
  then the user checkpoint. Commit, push and merge require explicit authorization.
