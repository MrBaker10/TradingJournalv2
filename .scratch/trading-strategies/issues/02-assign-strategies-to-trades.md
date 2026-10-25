# 02: Assign trading strategies and preserve historical rules

**What to build:** Let a trader optionally assign one trading strategy when creating
or editing a taken trade or missed setup, including an imported trade. Show the
assigned name and rules on the trade. Preserve that revision during ordinary edits,
clear an existing by-the-book answer when assignment changes, and protect assigned
imported trades from import undo.

**Blocked by:** 01 — Create, read and edit private trading strategies.

Status: ready-for-agent

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

Pending implementation and review.
