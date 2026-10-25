# Trading strategies: clarification

Status: resolved

## Confirmed decisions

- The user can write and maintain multiple private trading strategies.
- Each strategy has a required name and optional free-text chapters:
  prerequisites, entry, stop/risk, exit and exclusion criteria.
- A trade can have at most one strategy. Assignment is optional for taken trades
  and missed setups, including imported trades.
- Existing and newly imported trades start without a strategy; the user may
  assign one later when editing.
- Setup type, entry model and confluences remain separate trade classifications.
- By the book remains a manual assessment. On a taken trade with a strategy, it
  refers to that strategy's rules. Without a strategy, it retains its meaning of
  following the trader's own trading rules. Assigning a strategy does not set an
  answer automatically. Missed setups retain their existing behaviour.
- Existing strategy assignments retain their historical rule set when the
  strategy is edited. Changes apply to new assignments.
- The user can archive and reactivate strategies. Archived strategies remain
  visible on existing trades and cannot be newly assigned.
- The first release includes a dedicated strategy-management page for creating,
  reading, editing and archiving, plus strategy selection and display on trades.
  Strategy filters and strategy-specific analytics are deferred.
- Assigning, switching or clearing a strategy resets an existing by-the-book
  answer to unanswered. This refines Q5: an assignment never supplies a Yes/No
  answer, and an answer based on the previous assignment is cleared. An ordinary
  save that preserves the assignment preserves the answer.
- New assignments use the current revision, including assignments to older or
  backfilled trades. Existing assignments can explicitly adopt the current rules;
  that action also resets the by-the-book answer. Ordinary edits never update the
  assigned revision implicitly.
- A strategy assignment counts as manual enrichment for import undo. Removing
  the assignment makes the imported trade removable again if no other manual
  enrichment remains, following the existing content-based undo rules.

The user accepted the recommendations for Q1–Q2, Q3–Q5, Q6–Q8, Q9–Q11 and Q12–Q13 in the
conversation.
Canonical terms are recorded in `../../GLOSSARY.md`.
Historical rule preservation is recorded in
`../../docs/adr/0003-preserve-assigned-strategy-rules.md`.

## Existing boundaries

- The pre-market plan is a daily note, distinct from a reusable trading strategy.
- The personal rulebook with daily adherence remains deferred in
  `../../context/project-overview.md`; any overlap needs an explicit decision.
- Strategies are private under the existing ownership rules. Sharing, automated
  trading, signals, trading suggestions and AI remain outside the product scope.

## Open decisions

None. The user confirmed the persistence approach, test boundaries and shared
understanding in Q12–Q13. The implementation-ready scope is in `spec.md`.

## Confirmed implementation and test boundaries

Approved in Q12–Q13:

- Prefer a strategy record for ownership/lifecycle plus immutable revisions of
  its name and chapters, with an optional reference to a revision from each trade.
  This shares one historical rule set across all trades assigned to it.
- Rejected alternative: copy a strategy's name and chapters into each trade assignment.
  This avoids a shared revision record but duplicates the text and makes shared
  revision identity less explicit.
- Test the strategy lifecycle through its public application interface and public
  reads against Postgres with rollback fixtures: ownership, revision preservation,
  archive and reactivation. These tests do not cover browser interaction.
- Extend existing `saveTrade` tests and public detail/import-query tests to cover
  assignment, explicit revision updates, answer reset and undo eligibility. These
  tests cover persistence and permissions, not rendered form behaviour.
- Browser checks cover strategy creation/editing/archive/reactivation, trade
  selection, historical rule display, explicit update and the import undo count.
  Automated database tests provide the broader ownership and edge-case coverage.
- Reuse the installed stack, shared Zod validation, existing form controls and
  plain-text inputs. No new dependency is needed.

## Design tree

1. Strategy definition and optional chapters — confirmed.
   - Editing preserves historical rule sets — confirmed.
   - Retirement by archive, with reactivation — confirmed.
   - Persistence approach — immutable shared revisions, confirmed.
2. Optional single strategy per trade — confirmed.
   - Existing classifications retained — confirmed.
   - Manual by-the-book meaning — confirmed.
   - Reassignment, clearing and adopting updated rules — confirmed.
   - Import-undo treatment — confirmed.
3. Strategy management and trade assignment/display in first release — confirmed.
   - Strategy filtering and analytics — deferred.
   - Authoring uses the existing plain-text form patterns.
   - Test boundaries — confirmed.

This is the completed clarification record. See `spec.md` for implementation scope.
