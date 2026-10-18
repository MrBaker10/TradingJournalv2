# The ledger is never combined with trading P&L

Ledger entries (expenses and payouts) are real money, while the P&L of an evaluation
account is simulated, so the ledger net is shown only in its own place and never enters
Net P&L, the equity curve or the calendar. A single "business result" that blends both
would look like the obvious figure, but it mixes money that exists with money that does
not — the same reason a mixed real-plus-practice view is not offered.

## Consequences

- Ledger entries attach to a real account or to no account, never to a practice account.
- Payouts lower a linked account's balance for rule checks, but never appear as trading
  results.
