# 01: Record and list entries without an account

**What to build:** A new page, Ledger, as the eighth navigation item. The user records a
ledger entry by hand: an expense in one fixed category, or a payout, each with a date, a
USD amount (also $0) and an optional note. The page lists the user's entries newest first
with date, kind, category, amount (USD, as entered) and note. Without entries it shows an
empty state that explains what belongs in the ledger. Entries carry no account yet;
ticket 02 adds the account. Nothing outside this page changes.

Spec: `.scratch/ledger/spec.md`. Terms: `GLOSSARY.md`. Decision: `docs/adr/0002-ledger-separate-from-trading-pnl.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `context/Design.md` has a section for the ledger list, entry form and totals, written before the components.
- [x] Table `ledger_entries` via generated migration: user (cascade), optional account (restrict), entry date (`date`), kind, category, USD amount as `numeric`, optional note, created/updated timestamps.
- [x] Check constraints: category present exactly when kind is expense; amount ≥ 0.
- [x] Pure domain module: kinds and categories as constants, validation of an entry draft; Vitest covers it.
- [x] Query module `ledger`: create and list, filtered by the current user.
- [x] Server action with `getCurrentUser()`, Zod schema, explicit save.
- [x] Form: kind expense requires a category, kind payout offers none; $0 accepted, negative rejected.
- [x] List newest first; empty state explains what belongs in the ledger.
- [x] Navigation item "Ledger" as eighth item, in sidebar and mobile drawer.
- [x] DB tests (executed, not skipped): create/list for the owner; another user's entry is not listed; category required for expense and forbidden for payout; user deletion removes entries.
- [x] Net P&L, equity curve, calendar, streak, score and badges unchanged by entries. _(no query outside `ledger.ts` reads the table)_
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: empty state → create expense → create payout → both listed newest first; no new console errors.

## Review

Two-axis review (standards, spec) against `main` on 2026-10-19.

Fixed:
- Account key: the first commit used NO ACTION with a wrong rationale ("RESTRICT would
  block deleting a user"). Checked locally: the user-deletion test passes with RESTRICT
  as well, so the key is now `restrict` as the spec says; migration 0024 regenerated.
  Why no deferral is needed (unlike 0013) is recorded in `decisions.md`; the stale
  "deferred check" comment in `user-deletion.test.ts` is corrected.
- Form layout: Category on its own row, Date and Amount side by side from `sm`; a payout
  no longer leaves an empty grid cell.
- The category rule is its own domain function (`validateLedgerCategory`); the schema no
  longer calls the entry check with a dummy amount.
- The action throws on an unreadable amount instead of silently storing $0.
- The shared field class moved from a settings component to `components/ui`
  (`FIELD_CLASS`); the settings forms import it from there.
- Design.md §4.25 matches the build: native radios in `fieldset`/`legend`, `-$150.00`,
  the $100M ceiling. The ceiling's reason is in `decisions.md`.
- coding-standards.md → "Data fetching and validation": forms validate with the shared
  Zod schema via `safeParse`, no form library (rule approved by Sascha).
- Browser, added: $0 reset saved and shown as neutral `$0.00`; 390px width (iframe on
  the same origin, window minimum is 500px): one column, no horizontal scroll, rows
  inside the card; payout layout two columns; no console errors.

Second round, the points first left open:
- Message strings defined once: rule messages in the domain (`LEDGER_MESSAGES`), used
  by the schema; the save-failed message in the schema module, used by action and form.
- `LedgerEntryWrite`/`LedgerEntryRow` derived from the Drizzle schema and the domain
  check instead of hand-written; the form's `Draft` stays its own type, since it holds
  strings while the user types.
- `account_id` stays; ticket 02 now says the column, key and index already exist.
- coding-standards.md version table: `Zod / RHF / resolvers` became `Zod` (approved by
  Sascha).
- Found while checking in the browser: with an empty amount the category message did
  not show, because Zod skips `superRefine` after a type error. The refinement now has
  a `when` that runs it whenever kind and category parse (documented Zod 4 option).
  New schema test `src/schemas/__tests__/ledger.test.ts`; the schema uses relative
  imports for that, like `auth.ts`.
- Nothing left open.
