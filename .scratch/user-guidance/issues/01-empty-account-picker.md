# 01: Teaching empty state for an empty account picker

**What to build:** When the user has no active account, the account picker in the
trade form and the account step of the import wizard no longer show an empty list.
They state the rule — "Every trade belongs to an account." — and link to Settings →
Accounts. This applies whatever the user chose for the setup guide.

**Blocked by:** None (can start immediately).

Status: ready-for-agent

## Acceptance

- [ ] With no active account, the trade form's account picker shows the empty state
      with a working link to Settings → Accounts.
- [ ] With no active account, the import wizard's account step shows the same empty
      state and link.
- [ ] A user whose only accounts are archived sees the empty state too.
- [ ] With at least one active account (a practice account counts), both pickers
      behave exactly as before.
- [ ] Follows Design.md §1.8 (rule and next action, no apology) in both themes and at
      phone width; no new console errors.
