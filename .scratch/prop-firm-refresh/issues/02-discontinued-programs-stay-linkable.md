# 02: Discontinued programs stay linkable and marked

**What to build:** A discontinued program can still be chosen when linking an account, so an
account bought before the program was discontinued can carry its rules. The program select
shows it as "no longer sold", with its rule reference text as last seeded. An account
already linked to a discontinued program shows "no longer sold" next to the program's
name; its account rules, rule status, warnings and figures stay exactly as before.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decisions: `docs/adr/0001`, `docs/adr/0005`. Terms:
`GLOSSARY.md` → Discontinued program, Linked account, Account rules, Rule status.

**Blocked by:** 01

**Status:** done

- [x] The program options for the link form keep discontinued programs and say which they are; a database test covers it.
- [x] The program select labels a discontinued program "no longer sold" and still lets the user link to it.
- [x] Account settings show "no longer sold" next to a linked account's program when it is discontinued, and nothing when it is on sale.
- [x] Rule status and its warnings for a linked account are unchanged by its program being discontinued.
- [x] Full gate; browser check of linking an account to a discontinued program and of the note on an account linked to one, with the test data set up locally and removed afterwards.

## Review

Standards:
- Fixed: the help text said "data refresh", an operator term; it now reads "No longer
  sold: the program text is as last updated."
- Fixed: `AccountRulesRow.programDiscontinued` was first read by nothing but its test.
  By user decision (2026-10-28) the note is also visible without opening the sheet, so
  the settings accounts table now reads it and shows "No longer sold" after the firm name.
- Left open (judgement call): `discontinued_at is not null` appears in both
  `prop-firms.ts` and `account-rules.ts`; two short expressions, kept inline.

Spec:
- Account settings: the table shows "<firm> No longer sold"; the account sheet labels
  the program "<name> — no longer sold" and adds the note under the select.
- Rule status and warnings: `evaluateRules` is pure over `getAccountRules` and
  `getAttempt`, whose results the DB test shows unchanged apart from the flag.

Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (96 files, 1464 passed, none
skipped), `pnpm build` all pass. Browser (local): removed "Select 300k (Daily Payout)"
from `context/PropFirmsData.md` and seeded (1 discontinued). `/settings` → Add account
("Discontinued link test", $300,000) → Program "Select 300k (Daily Payout) — no longer
sold" → target 14000, drawdown 8000 → Create account. The accounts table shows
"Tradeify No longer sold" for it and no note for the two Lucid Trading accounts (on
sale). The sheet keeps the label and shows the note; the Rule status card showed target
$0.00 of $14,000.00 and floor $292,000.00 in the first run. No console errors. Cleanup
after each run: a DB query showed exactly one account and its link created since the run
started; that account was deleted (link by cascade), the file restored and seeded (1 back
on sale).
