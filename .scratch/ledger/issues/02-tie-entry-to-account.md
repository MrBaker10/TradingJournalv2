# 02: Tie an entry to a real account

**What to build:** When recording an entry, the user can pick one of their real accounts
or leave the account empty (e.g. a data feed). Practice and archived accounts are not
offered. The list shows the account per entry; entries tied to an account that was
archived later stay listed with that account. An account with ledger entries can no
longer be hard-deleted — it is archived instead, like an account with trades.

Spec: `.scratch/ledger/spec.md`. Terms: `GLOSSARY.md`.

Ticket 01 already created `ledger_entries.account_id` (nullable, `restrict` on account
deletion) and its index: this ticket needs no migration.

**Blocked by:** 01 (Record and list entries without an account)

**Status:** ready-for-agent

- [ ] Entry form offers an optional account picker with only the user's real, non-archived accounts.
- [ ] Create verifies the account ID server-side: owned by the user, not practice, not archived.
- [ ] List shows the account column; empty account renders as such; archived accounts still show their name.
- [ ] Hard deletion of an account requires zero trades and zero ledger entries; the account editor reflects this.
- [ ] DB tests (executed): practice, foreign and archived account rejected on create; entry without account accepted; hard-deleting an account with entries is refused.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: create an entry with and without account; practice and archived accounts absent from the picker; no new console errors.
