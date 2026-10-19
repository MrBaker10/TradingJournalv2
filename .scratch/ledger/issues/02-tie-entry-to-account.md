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

**Status:** done

- [x] Entry form offers an optional account picker with only the user's real, non-archived accounts.
- [x] Create verifies the account ID server-side: owned by the user, not practice, not archived.
- [x] List shows the account column; empty account renders as such; archived accounts still show their name.
- [x] Hard deletion of an account requires zero trades and zero ledger entries; the account editor reflects this.
- [x] DB tests (executed): practice, foreign and archived account rejected on create; entry without account accepted; hard-deleting an account with entries is refused.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: create an entry with and without account; practice and archived accounts absent from the picker; no new console errors.

## Review

Two-axis review (standards, spec) against `a5ce41e` on 2026-10-19.

Fixed:
- Types derived instead of hand-written: `LedgerAccount` and `accountName` come from
  `accounts.$inferSelect`; the form uses the query's `LedgerAccount`.
- `hardDeleteAccount` catches a failing delete and returns a message instead of throwing.
- Below `sm` the account-and-note line keeps the note's full text in `title`.
- `ledgerAccountFilter`/`isLedgerAccount` renamed to `assignableAccountFilter`/
  `isAssignableAccount`.
- "The account editor reflects this" (decided by Sascha): an archived account with trades
  or ledger entries no longer offers Delete permanently; a quiet note says it stays
  archived. Settings reads `hasLedgerEntries` next to `hasTrades`; Design.md (account
  management → Archived accounts) describes it.
- The Delete account copy in Settings names the ledger among what is removed.
- Ticket 05 gained a criterion: update stays filtered by user and checks the account,
  since the list joins `accounts` without a user filter.
- Browser, added: 390px (iframe on the same origin) — form one column, account joins the
  note line, no horizontal scroll; Settings shows the note for "Old eval (test)" and
  Delete permanently for an unused archived test account, which then deleted; no
  console errors.

Moved to a new ticket:
- Switching an account with ledger entries to practice → ticket 06 (decided by Sascha:
  lock the toggle).

Left open on purpose:
- `createLedgerEntry` checks the account in its own SELECT before the INSERT, unlike the
  statement-level lock in `deleteUnusedAccount`; one user works on their own accounts.
- A server-side account refusal arrives as a toast, not under the picker; the picker
  only offers valid accounts.
