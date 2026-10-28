# 02: Discontinued programs stay linkable and marked

**What to build:** A discontinued program can still be chosen when linking an account, so an
account bought before the program was discontinued can carry its rules. The program select
shows it as "no longer sold", with its rule reference text as last seeded. An account
already linked to a discontinued program shows "no longer sold" next to the program's
name; its account rules, rule status, warnings and figures stay exactly as before.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decisions: `docs/adr/0001`, `docs/adr/0005`. Terms:
`GLOSSARY.md` → Discontinued program, Linked account, Account rules, Rule status.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The program options for the link form keep discontinued programs and say which they are; a database test covers it.
- [ ] The program select labels a discontinued program "no longer sold" and still lets the user link to it.
- [ ] Account settings show "no longer sold" next to a linked account's program when it is discontinued, and nothing when it is on sale.
- [ ] Rule status and its warnings for a linked account are unchanged by its program being discontinued.
- [ ] Full gate; browser check of linking an account to a discontinued program and of the note on an account linked to one, with the test data set up locally and removed afterwards.
