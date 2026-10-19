# Spec: Ledger

Status: ready-for-agent

Roadmap: `context/project-overview.md` → Phase 3, item 3. Terms: `GLOSSARY.md`.
Decision: `docs/adr/0002-ledger-separate-from-trading-pnl.md`.

## Problem Statement

A prop-firm trader spends real money on evaluations, resets, activations, platform
subscriptions and data feeds, and occasionally receives payouts. None of that is in the
journal. The trader cannot answer "what has prop trading actually cost or paid me", and
the account ↔ program link (Phase 3, item 4) has nowhere to read resets and payouts from.

## Solution

A new page, Ledger, as the eighth navigation item. The user records ledger entries by
hand: an expense in one fixed category, or a payout, each with a date, a USD amount, an
optional real account and an optional note. The page lists entries newest first and shows
the totals of payouts, expenses and the ledger net, in the display currency. The ledger
net is real money and stays on this page: it never enters Net P&L, the equity curve or
the calendar, and it never feeds streak, score or badges.

## User Stories

1. As a prop trader, I want to record an expense with date, amount, category and an optional note, so that every real cost is captured.
2. As a prop trader, I want to pick the expense category from evaluation, reset, activation, subscription, data or other, so that costs group consistently.
3. As a prop trader, I want to record a payout with date, amount and an optional note, so that money received is captured.
4. As a prop trader, I want to tie an entry to one of my real accounts, so that I can see what each account cost and paid.
5. As a prop trader, I want to leave the account empty for costs that belong to no account, such as a data feed, so that every cost still fits.
6. As a trader, I want practice accounts not offered when choosing an account for an entry, so that practice stays apart from real money.
7. As a prop trader, I want to record a reset at $0 for a free reset, so that the reset is still on record.
8. As a prop trader, I want to enter amounts in USD, so that they match how prop firms bill.
9. As a prop trader with EUR accounts, I want totals shown in my display currency, so that the ledger reads like the rest of the app.
10. As a prop trader, I want the list newest first with date, kind, category, account, amount and note, so that I can scan recent activity.
11. As a prop trader, I want totals for payouts, expenses and the ledger net, so that I know where I stand.
12. As a prop trader, I want to filter the list by account and by date range, so that I can answer what one account or one year cost.
13. As a prop trader, I want totals to follow the active filter, so that the numbers match the list I see.
14. As a prop trader, I want to edit an entry, so that I can correct a typo.
15. As a prop trader, I want to delete an entry after a confirmation, so that a wrong entry disappears without a surprise.
16. As a prop trader, I want entries tied to an archived account kept and shown, so that history never vanishes.
17. As a prop trader, I want archived accounts not offered for new entries, so that pickers stay current.
18. As a trader, I want the ledger net shown as a neutral money figure with the semantic colour, without glow or celebration, so that real money is never turned into a reward.
19. As a trader, I want my Net P&L, equity curve and calendar unchanged by any ledger entry, so that trading results and business money never blend.
20. As a trader, I want my streak, score and badges unaffected by ledger entries, so that only journaling earns progress.
21. As a user, I want my ledger visible only to me, so that my finances stay private.
22. As a user, I want deleting my user to delete my ledger, so that nothing remains.
23. As a trader, I want an empty state that explains what belongs in the ledger, so that I know how to start.
24. As a trader, I want a recurring subscription entered once per month by hand, so that nothing is booked without me.

## Implementation Decisions

- **Schema (new table, generated migration):** `ledger_entries` with user (cascade on user
  deletion), optional account (restrict on account deletion; an account with entries is
  archived, not hard-deleted, like an account with trades), entry date (`date`), kind
  (`expense` | `payout`), category (expense only; `evaluation`, `reset`, `activation`,
  `subscription`, `data`, `other`), amount in USD as `numeric` (non-negative; the kind
  carries the sign), optional note, created/updated timestamps. Check constraints: category
  present exactly when kind is expense; amount ≥ 0.
- Hard deletion of an account must also count ledger entries, not only trades; the
  "zero assigned trades" rule extends to "zero trades and zero ledger entries".
- **Domain module (pure):** the kinds and categories as constants, validation of an entry
  draft, and the ledger net as payouts minus expenses in integer minor units.
- **Query module `ledger`:** create, update, delete and list, all filtered by user; account
  ID verified as owned, real (not practice) and, for new or changed assignments, not
  archived. Totals aggregated in SQL in one statement for the active filter.
- **Display currency:** the ledger page is not scoped by the account selector; it uses
  the "All accounts" display currency (`withDisplayCurrency` with no selected account).
  When that is not USD, each entry converts with the ECB rate of its entry date, the same
  rule as a trade's USD P&L, rounded per entry, then summed.
- **Actions:** server actions with `getCurrentUser()`, Zod schemas for create and update,
  explicit save; delete behind a confirmation.
- **UI:** new route and navigation item "Ledger" (eighth item); `context/Design.md` gets a
  section for the ledger list, entry form and totals before the components are built.
  Money uses the existing semantic colour and formatting helpers.
- No change to dashboard, analytics, progress or the CSV export.

## Testing Decisions

- A good test drives the public functions of the query module against real Postgres and
  asserts what a user would see, not SQL shape.
- **Seam: the `ledger` query module** (prior art: `account-editor.test.ts`,
  `display-currency.test.ts`, `user-deletion.test.ts`). Cases: create/list/update/delete
  for the owner; another user's entry is neither listed nor changeable; a practice
  account, a foreign account and an archived account (on create) are rejected; category
  required for expense and forbidden for payout; totals and ledger net for a filter;
  conversion per entry date in a EUR display currency; user deletion removes entries;
  hard-deleting an account with entries is refused.
- Domain module covered by Vitest unit tests for validation and the net.
- DB tests must execute, not skip; full gate from `context/ai-interaction.md` plus the
  browser click path (create expense, create payout, filter, edit, delete, empty state).

## Out of Scope

- Automatic recurring entries or subscription management.
- Currencies other than USD for entry amounts.
- Receipts or file attachments.
- Any combination with trading P&L, including a "business result" figure (ADR 0002).
- Using reset or payout entries for rule checks — that is the prop-firm-link spec.
- Ledger columns in the CSV export or import.

## Further Notes

- The prop-firm-link spec reads reset expenses (attempt boundaries) and payouts
  (balance) from this table, so this spec lands first.
- Confirmed 2026-10-18: the ledger page ignores the account selector and offers its own account
  filter, because entries without an account would otherwise vanish when an account is
  selected.
