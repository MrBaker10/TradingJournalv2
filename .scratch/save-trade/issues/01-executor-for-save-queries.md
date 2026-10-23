# 01: Let the save path's queries run inside a given transaction

**What to build:** Nothing changes for the trader. The queries the save path reads
through accept an optional database executor, as the import and FX queries already do:
owned accounts, assignable accounts, the instrument, the two tag counts, commission
rates, the owned trade and the stored commissions of its assignments. Without the
argument each query behaves exactly as before. This lets the save module in the next
tickets run its reads in a rolled-back test transaction.

Spec: `.scratch/save-trade/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The eight queries take an optional executor that defaults to the shared client.
- [x] No caller changes; no query changes its result.
- [x] Existing query and action-related tests unchanged and passing with the database reachable (none skipped).
- [x] Full gate from `context/ai-interaction.md`; no browser check needed (no behaviour change), stated as such.

## Review

Review of `687d953`, two axes (Standards, Spec).

- **Fixed:** the new `ReadExecutor` JSDoc in `accounts.ts`, `commission-rates.ts` and
  `instruments.ts` tied a general type to one caller ("the save path") and pointed at
  `trades.ts` while the spec names the import and FX queries. Now the neutral wording
  of `trades.ts:41`.
- **Left open on purpose:** `ReadExecutor` is declared per module again instead of
  imported from `trades.ts`. Every query module declares its own executor type today
  and none imports another's; one shared type would be a refactor outside this ticket.
- **Spec:** all eight queries covered; the other reads of `createTrade`/`updateTrade`
  (`ensureFxRates`, `storedRateOn`, `listForeignCurrencies`) already take an executor,
  `getNextLinkSortOrder` is only on the add-link path. No scope creep, no caller
  changed, no positional-argument collision.
