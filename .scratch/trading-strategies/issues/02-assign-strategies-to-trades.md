# 02: Assign trading strategies and preserve historical rules

**What to build:** Let a trader optionally assign one trading strategy when creating
or editing a taken trade or missed setup, including an imported trade. Show the
assigned name and rules on the trade. Preserve that revision during ordinary edits,
clear an existing by-the-book answer when assignment changes, and protect assigned
imported trades from import undo.

**Blocked by:** 01 — Create, read and edit private trading strategies.

Status: done

## Acceptance

- [ ] Open a new trade: no strategy is preselected. Existing trades and newly
      imported trades also have no inferred assignment.
- [ ] Select an owned strategy, save and reopen a trade; its assigned name and
      chapters are displayed. Repeat for a missed setup and an imported trade.
- [ ] At most one strategy is assigned. Assignment remains optional and independent
      of setup type, entry model and confluences.
- [ ] New assignments use the current revision even for backfilled trades.
      Strategy and revision ownership are verified server-side.
- [ ] Edit an assigned strategy's name and chapters, then reopen its trade: the
      trade still displays the old name and rules. Saving unrelated trade changes
      preserves its revision and by-the-book answer.
- [ ] Assigning, switching or clearing a strategy clears an existing Yes or No
      by-the-book answer to unanswered. Assignment never supplies an answer.
      Unchanged assignments retain ordinary manual answer editing; missed setups
      retain their existing null assessment behaviour.
- [ ] By-the-book meaning refers to assigned rules when present and the trader's
      general rules otherwise. No new scoring contribution is introduced.
- [ ] Import-undo preview and removal use the same content-based protection:
      assigned trades survive undo. Clearing assignment restores eligibility only
      when no other manual enrichment remains.
- [ ] Real Postgres tests extend the existing trade-save, trade-detail and import
      query seams. Cover historical reads, answer transitions, missed setups,
      backfilled assignments, cross-user rejection and preview/removal agreement.
- [ ] Run the required project verification gate. Browser checks exercise create
      and edit assignment, historical display after a strategy edit, switching,
      clearing, unchanged saves and import-undo preview counts. Inspect new console
      errors and record evidence during implementation.

## Do not build

- Explicit adoption of newer rules or archive/reactivation controls.
- Multiple strategies per trade, automatic assignment, strategy filters or analytics.
- Changes to money, account, time, classification or scoring rules.

## Open questions

None. Apply the confirmed spec's assignment and import-undo rules.

## Review

### Verification (2026-10-25)

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (77 files, 1301 tests, none skipped, real Postgres), `pnpm build`: all passed in the final run before commit (1301 tests).
- Migration `0029` applied locally.
- Browser (new trade on the practice account "Sim (test)", then edit): no strategy preselected; assigned strategy shown on the detail page with name and chapters; renamed the strategy, trade still shows the old name and entry text; unrelated save kept revision and By the book "Yes"; switching strategy cleared By the book; clearing removed the Strategy card; no console errors.
- **Not browser-verified:** assignment on a missed setup and on an imported trade, and the import-undo preview counts. Doing so would mutate the user's real imported trades. Covered by DB tests only (preview/removal agreement, clear restores eligibility, no inference on import).
- The test trade `/journal/81354` (practice account, note "TEST strategy ticket 02") remains in the local dev DB for the user to delete.

### Findings

Decided in this ticket:

- A save that omits `strategyId` keeps the assignment; clearing is an explicit `null` (fixed after review).
- Changing the assignment resets By the book server-side; the form resets it too and says so.
- Archived strategies are rejected for new assignment on the server although archive controls come in ticket 04.
- The strategy select works by strategy, not revision: keeping the same strategy keeps the trade's older revision (ADR 0003).
- The check of the requested strategy runs before the write transaction without a lock; an archive in that window could let one assignment through (single user, accepted).
- CSV export does not include the strategy (not asked for).
- No index on `trades.strategy_revision_id`; relevant only for later per-strategy counts.

Left open (judgement calls):

- `queryTradeRows` rebuilds the nested strategy from nine flat aliases; a `toJournalTradeStrategy(row)` helper would read better.
- `StrategyOption` in `trade-form.tsx` duplicates the return type of `strategyOptions`.
- The "assignment changed" rule is derived in the form by string comparison and on the server by `strategyAssignmentChanged`.
- `StrategyRules` was extracted from `strategy-manager.tsx` (ticket 01) for reuse on the detail page.

Added after review: By the book now says it refers to the strategy's rules, or the trader's own when none is set.
