# Current Feature

Only the active task belongs here. Read this file before implementation; completed
work lives in `context/history.md`, rationale in `context/decisions.md`.
Replace the Feature block for each new task. After merge, append one short entry to
History and reset this file to “Nothing in progress”.

## Status

**In progress: account-settings-redesign** — Branch `feature/account-settings-redesign`

## Feature: account-settings-redesign

**Goal.** Replace the account tile grid with a compact list and one inline editor.
Create and edit account fields, including commission rates, only on explicit save.

**Scope.** Shared create/edit form, unsaved-change confirmation, atomic account and
commission persistence, validation, transaction tests, responsive browser verification,
and Design.md. Default selection, ordering and archiving remain separate actions,
disabled while editing. Preserve historical FX conversion when balance/currency do not change.
Browser verification additionally required correcting the account-trade correlation
and stacking the existing shell on small screens so the editor remains usable.

### Do not build

- No schema migration, dependency changes or new account attributes.
- No changes to stored trade commissions or account visibility rules.
- No unrelated settings redesign, commits, merges, pushes or branch deletion.
- Preserve pre-existing skill/workflow edits. The previous working feature document
  is backed up at `/private/tmp/tradingjournal-current-feature-before-account-redesign.md`.

### Acceptance

- [x] Shared inline editor with explicit create/save and cancel.
- [x] No writes on blur, toggles, commission edits or Enter in inputs.
- [x] Discard confirmation and failure-safe draft retention verified in Chrome.
- [x] Atomic writes, ownership, currency lock and historical FX tests.
- [x] Lint, typecheck, full tests and build pass in order after browser fixes.
- [x] Desktop/mobile browser interaction and console checks.

### Verification

Chrome via temporary Playwright 1.63.0: 19 browser checks passed on 2026-10-03.
Desktop 1440px and mobile 390px screenshots visually inspected. Verified no write
before explicit save, reload persistence, cancel/discard, sidebar navigation,
browser Back, native reload warning, duplicate/incomplete rates, validation,
save-failure retention/retry, pending controls and currency lock. No unexpected
console errors; one HTTP 503 was deliberately injected for the failure test.
Synthetic local test users and their data were removed after verification.
Artifacts and test script: `/private/tmp/tradingjournal-account-browser-check/`.
No project dependency, lockfile or database schema changes.

The currency-lock regression reproduced the existing SELECT correlation bug before
its fix; all nine account-editor integration tests passed afterwards. Final gates
passed in order after the mobile layout correction: lint, typecheck, all 1004 tests
in 58 suites, and the production build.

### Review (2026-10-18)

Two-axis review (standards, spec) against HEAD `37654f0`. Scope addition approved:
archive and default use the inline confirm strip with Cancel/Confirm instead of the
timed double click.

Fixed:
- Commission disclosure and inline editor expand/collapse with `motion` again
  (coding-standards.md → Motion); a rate error keeps the disclosure open.
- Constants renamed to `ACCOUNT_FIELD_CLASS` / `ACTION_CLASS`; editor close button 44px.
- Removed the per-field write actions (`renameAccount`, `togglePractice`,
  `setAccountCurrency`, `setStartingBalance`, `setCommissionRate`,
  `removeCommissionRate`), their schemas and the two commission-rate writers: every
  account write now goes through the atomic save.
- The editor's currency lock reuses `hasAssignedTrades()` (one correlation pattern) and
  new accounts use `getNextSortOrder`; row balance reads the stored amount with
  `amountToCents`; discard text is one constant; Design.md row description matches.

Left open deliberately:
- `saveAccountDraft` length (~100 lines): one transaction, read top to bottom.
- `account-editor.ts` beside `accounts.ts`, names `AccountForm`/`AccountCreateTile`,
  the hand-written `AccountDraftWrite` and the `editing` flag, manual `safeParse`.
- `updateAccountCurrency` / `updateStartingBalance` have no production caller left but
  are kept with their existing query tests.

Verification after fixes: lint, typecheck, 1004 tests in 58 suites, build — all pass.
Chrome (desktop): disclosure and editor animate open/closed, focus returns to Edit,
discard confirmation on a dirty draft (cancel keeps, accept discards, nothing written),
close button 44×44, balances render, no console errors.

### Open questions

None. No commit, merge or deployment has been performed.
