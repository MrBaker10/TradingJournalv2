# 01: Let the save path's queries run inside a given transaction

**What to build:** Nothing changes for the trader. The queries the save path reads
through accept an optional database executor, as the import and FX queries already do:
owned accounts, assignable accounts, the instrument, the two tag counts, commission
rates, the owned trade and the stored commissions of its assignments. Without the
argument each query behaves exactly as before. This lets the save module in the next
tickets run its reads in a rolled-back test transaction.

Spec: `.scratch/save-trade/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The eight queries take an optional executor that defaults to the shared client.
- [ ] No caller changes; no query changes its result.
- [ ] Existing query and action-related tests unchanged and passing with the database reachable (none skipped).
- [ ] Full gate from `context/ai-interaction.md`; no browser check needed (no behaviour change), stated as such.
