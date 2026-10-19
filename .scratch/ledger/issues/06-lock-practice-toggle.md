# 06: Lock the practice toggle while ledger entries exist

**What to build:** An account with ledger entries cannot be switched to practice. In the
account editor the Practice toggle is disabled and explains why, the same way the
currency is locked once trades exist; the server refuses the change too. Without the
lock, a real account with expenses or payouts could become a practice account and put
practice money into the ledger (docs/adr/0002: "never to a practice account").

Decided by Sascha on 2026-10-19 during the review of ticket 02.

Spec: `.scratch/ledger/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 02 (Tie an entry to a real account)

**Status:** ready-for-agent

- [ ] `context/Design.md` (account management) names the lock and its wording before the component changes.
- [ ] `context/project-overview.md` states the rule next to the practice-account rule.
- [ ] Saving an account with ledger entries as practice is refused in the query, in the statement itself like the currency lock.
- [ ] The editor disables the Practice toggle for such an account and says why; switching an account without entries still works.
- [ ] DB tests (executed): switching to practice refused with a ledger entry, allowed without one.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: account with an entry shows the locked toggle; account without entries can still be switched; no new console errors.
