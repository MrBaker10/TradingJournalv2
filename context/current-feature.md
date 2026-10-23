# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress: save-trade** — Branch `feature/save-trade`, ticket 01

## Feature: save-trade

**Goal.** One module saves a trade, new or edited; the two server actions shrink to
adapters. Spec: `.scratch/save-trade/spec.md`, tickets under
`.scratch/save-trade/issues/`.

**Scope (ticket 01).** The eight queries the save path reads through take an optional
executor that defaults to the shared client: `listOwnedAccountIds`,
`listAssignableAccounts` (`src/db/queries/accounts.ts`), `getInstrumentById`
(`instruments.ts`), `listCommissionRates` (`commission-rates.ts`),
`countExistingConfluenceTags`, `countExistingMistakeTags`, `getOwnedTrade`,
`listAssignmentCommissions` (`trades.ts`). Same pattern as the import and FX queries.

### Do not build

- No caller change, no query result change, no new tests (no behaviour changes; the
  save module's tests come with ticket 02 onward).
- Everything under the spec's "Out of Scope".

### Acceptance

- [x] The eight queries take an optional executor that defaults to the shared client.
- [x] No caller changes; no query changes its result.
- [x] Existing query and action-related tests unchanged and passing, DB tests executed.
- [x] Lint, typecheck, full tests, build.
- [x] Browser: not applicable — no behaviour change.

### Open questions

None.

<!--
For each new task, record:
- Goal: the intended result.
- Scope: affected modules/files and any schema or domain changes.
- Do not build: concrete exclusions for this task.
- Acceptance: observable results and applicable verification from ai-interaction.md.
- Open questions: unresolved requirements; never invent product decisions.
-->
