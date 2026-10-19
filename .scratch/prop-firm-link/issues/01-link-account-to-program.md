# 01: Link a real account to a prop firm program

**What to build:** In the account editor in settings, the user can link one of their real
accounts to a prop firm program and enter the account rules they bought: evaluation start
date, profit target, max drawdown with its type (static, EOD trailing, intraday trailing)
and optional lock level, optional daily loss limit, optional consistency percentage,
optional minimum trading days. The program's rule text is shown beside each field. Saving
is explicit, following the existing account editor pattern. The link can be edited and
removed later. Practice accounts are not offered for linking; an account without a
starting balance cannot be linked; a linked account can no longer be switched to practice.
Entered rules stay as they are when the program's text changes later.

Spec: `.scratch/prop-firm-link/spec.md`. Terms: `GLOSSARY.md`. Decisions:
`docs/adr/0001-user-entered-account-rules.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Generated migration adds the account rules table: at most one row per account, cascade on account deletion, restrict on program deletion, money as `numeric` in USD, drawdown type limited to `static` | `eod_trailing` | `intraday_trailing`.
- [x] Link form in the account editor shows the program's rule text next to each rule field; optional rules can stay empty.
- [x] Save verifies server-side: account owned by the user, real (not practice), non-zero starting balance, program exists; lock level only with EOD trailing.
- [x] Edit and remove the link; removing leaves the account and its trades untouched.
- [x] Switching a linked account to practice is refused with a clear message (query layer, not only the form).
- [x] DB tests (executed): practice account linking refused; foreign account refused; zero starting balance refused; saving again replaces the one link per account (the link is part of the account draft, like commission rates); practice toggle refused while linked.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: link an account, edit it, remove it; practice accounts not offered; no new console errors.

## Review

Two-axis review (standards, spec) against `8b21e07` on 2026-10-19, uncommitted tree.

Fixed:
- A linked account switched to practice now hears "This account is linked to a prop
  firm program. Remove the link to make it a practice account." instead of the linking
  message (DB test updated).
- `listAccountRules` and `AccountRulesWrite`/`AccountRulesRow` moved to their own query
  module `account-rules.ts`; the account editor keeps only the write.
- `saveAccountRules` takes the starting balance as a number, not a one-field object.
- Drawdown help lines come from one `Record<DrawdownType, string>` instead of a nested
  ternary.
- Design.md §4.12 now names every help line the form shows, and the account size under
  the program select.
- decisions.md records: link inside the account draft, no `user_id` (like
  `account_commission_rates`), practice lock against the saved end state (unlink plus
  practice in one save is allowed), consistency as whole percent, lock level meaning,
  program RESTRICT.

Left open on purpose:
- The form repeats the starting-balance check before sending (`linked` and balance > 0)
  instead of a refinement on `createAccountSchema`: a refinement there breaks
  `updateAccountSchema`'s `.extend`. The server check in `checkLinkable` is the truth.
- `AccountProgramLink` (~200 lines) and `save()` exceed the size guideline, like the
  existing `AccountForm`; splitting would be a refactor outside this ticket.
- Write/row types are hand-written in cents next to the Zod and Drizzle shapes, as
  `AccountDraftWrite` already is.
- `type Tx`, `IsoDate` from `streak.ts` and `amountToCents` follow existing patterns.

Browser (2026-10-19, local dev, "Lucid 25k Eval" and "Sim (test)"):
- Save with a program but empty target and drawdown: both fields report, focus on the
  first; Practice toggle shows "Locked — linked to a prop firm program".
- Link LucidFlex 50k, EOD trailing, lock level 25100, consistency 50: toast "Account
  saved", row reads "Lucid Trading · LucidFlex 50k", DB row matches.
- Edit: fields prefilled; Static hides the lock level, saved with lock level null.
- "Not linked" hides the rule fields and unlocks Practice; saved: no link left, the
  account's 59 trades untouched.
- Practice account: program select disabled, "Practice accounts can't be linked.", no
  rule fields.
- No console errors after reload and reopening the editor. 390px width not checked.

After the checkpoint (decided by Sascha): an empty Profit target or Max drawdown now
reads "Enter the profit target" / "Enter the max drawdown" instead of "Enter the amount
as a number", which stays for typed text (schema test added, Design.md §4.12). Checked
in the browser; gates rerun: 63 files, 1071 tests.

