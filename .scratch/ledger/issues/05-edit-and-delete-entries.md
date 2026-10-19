# 05: Edit and delete entries

**What to build:** The user can edit an entry (kind, category, date, amount, account,
note) with an explicit save, and delete an entry after a confirmation. Another user's
entry can be neither changed nor deleted. An entry already tied to an account that was
archived keeps it on edit; a new or changed assignment must be to a real, non-archived
account.

Spec: `.scratch/ledger/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 02 (Tie an entry to a real account)

**Status:** done

- [x] Query module `ledger`: update and delete, filtered by the current user.
- [x] Server actions with `getCurrentUser()`, Zod schema for update, explicit save.
- [x] Account check on update: unchanged archived assignment allowed; new or changed assignment owned, real and not archived.
- [x] Update filters the entry by user and never ties it to another user's account: the list joins `accounts` without a user filter and relies on this.
- [x] Delete only after a confirmation step.
- [x] DB tests (executed): update/delete for the owner; another user's entry cannot be updated or deleted; changing to a practice, foreign or archived account rejected; category rules hold on update.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: edit an entry and save; cancel a delete; confirm a delete; list and totals update; no new console errors.

## Review

Two-axis review (standards, spec) against `c461b21` on 2026-10-19, in two rounds. Edit
inline under the row and Delete in the edit form with the two-click confirm (§4.20),
both decided by Sascha. After round one Sascha asked to resolve its open points too.

Fixed in round one:
- The account an entry already has stayed allowed on edit even as practice; it now
  stays only while owned and real (archived allowed). Test pins it.
- Update and delete both take `entryId` from one shared id schema.
- `toLedgerWrite` in the actions maps a parsed entry once for add and edit.
- The row's Edit button has a 32px target instead of bare text.
- Design.md §4.25: Edit on the open row closes it; "This entry no longer exists." added
  to the microcopy.

Resolved open points (round one) and fixed in round two:
- The two-click confirm existed four times (trade form, screenshot slots, archived
  accounts, ledger); it is now `src/hooks/use-two-click-confirm.ts`, and all four use it.
  Two of them gained the unmount cleanup they lacked.
- The ledger form no longer branches on `edit`: `useLedgerDraft`
  (`src/hooks/use-ledger-draft.ts`), `ledger-entry-fields.tsx` (fields, primary button,
  `runWithToast`), `ledger-add-form.tsx` (renamed from `ledger-entry-form.tsx`) and
  `ledger-edit-form.tsx`.
- Check and write are no longer two steps: update is one `UPDATE … WHERE` whose `exists`
  holds the account row `for share`; create checks with `for share` and inserts in one
  transaction (Drizzle's insert-select needs every table column, so not one statement).
  If an update matches nothing, a follow-up read picks the message; tests pin both.
- An account switched to practice after it was assigned was offered as "· Archived";
  rows now carry `accountIsPractice`, and such an account shows as "· Practice",
  disabled (Design.md §4.25).
- "Saving…" no longer shows while a delete runs: save and delete have their own
  pending state.

Verification after round two: `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 61 files /
1054 passed (29 ledger DB tests executed); `pnpm build` ok. Browser, no console errors:
ledger add (empty submit shows both messages and focuses the first), edit, single
Delete click falls back after 3.5s, two clicks delete, totals back to -$249.00 /
+$985.56, "Old eval (test) · Archived" offered; trade edit: one "Delete trade" click
arms and falls back, nothing deleted; new trade: a locally staged test screenshot arms
"Confirm remove", falls back, two clicks remove it; Settings: a test account created and
archived, "Delete permanently" arms and falls back, two clicks delete it.

Left open on purpose:
- The ledger list is a client component as a whole: which row is open is state shared
  by all rows.
- The practice "· Practice" option was checked in code and the update test, not in the
  browser: the dev data has no entry on a practice account, and making one means
  switching a real account with entries to practice — the case ticket 06 will lock.
