# 06: Lock the practice toggle while ledger entries exist

**What to build:** An account with ledger entries cannot be switched to practice. In the
account editor the Practice toggle is disabled and explains why, the same way the
currency is locked once trades exist; the server refuses the change too. Without the
lock, a real account with expenses or payouts could become a practice account and put
practice money into the ledger (docs/adr/0002: "never to a practice account").

Decided by Sascha on 2026-10-19 during the review of ticket 02.

Spec: `.scratch/ledger/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 02 (Tie an entry to a real account)

**Status:** done

- [x] `context/Design.md` (account management) names the lock and its wording before the component changes.
- [x] `context/project-overview.md` states the rule next to the practice-account rule.
- [x] Saving an account with ledger entries as practice is refused in the query, in the statement itself like the currency lock.
- [x] The editor disables the Practice toggle for such an account and says why; switching an account without entries still works.
- [x] DB tests (executed): switching to practice refused with a ledger entry, allowed without one.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: account with an entry shows the locked toggle; account without entries can still be switched; no new console errors.

## Review

Standards and spec review, 2026-10-19.

- Fixed: the query that names the refusing lock now filters on `user_id`
  (coding-standards → Database) and reads `hasLedgerEntries` explicitly instead of
  inferring it; an unexplained refusal reports "Account not found or archived".
- Fixed: the lock applies to the switch to practice, not the target value. A practice
  account that already has an entry (not reachable through the app) stays saveable and
  can return to real; the editor disables the toggle only while it is off. Pinned by
  a DB test.
- Fixed: the `hasLedgerEntries` doc comment stays generic; it also guards permanent
  delete.
- Kept (decided by Sascha 2026-10-19): `disabled:opacity-50` on the shared
  `ToggleSwitch`, matching `FIELD_CLASS`; it also dims the trade form's toggles when
  disabled, and dims twice inside the editor's disabled fieldset while saving.
- Open (judgement): `saveAccountDraft` is ~125 lines; the lock note adds a second
  `<p>` instead of replacing the help text like the currency lock. Design.md allows it.

Browser (localhost:3000/settings, 2026-10-19): restored "Old eval (test)" (one ledger
entry) → Edit: Practice toggle disabled, "Locked — this account has ledger entries"
below the description, click changes nothing ("No changes"); Cancel, archived again.
"Sim (test)" (no entries): Practice off → Save → "Account saved"; on → Save →
"Account saved", Practice marker back. No console errors after reload.
