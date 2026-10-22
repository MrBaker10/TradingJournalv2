# 05: Remove the unused multiplier functions and fix the pointers

**What to build:** The domain accounts module keeps only what production runs: grouping
accounts for the account switcher. The multiplier, practice exclusion and
aggregate-membership functions and their tests are removed. Comments that pointed to
them point to the scope module. The agent instructions name the scope module as the one
owner of every money and visibility expression.

Spec: `.scratch/money-scope/spec.md`. Terms: `GLOSSARY.md` → Real account, Practice account.

**Blocked by:** 02, 03, 04

**Status:** ready-for-agent

- [ ] The domain accounts module exports only the switcher grouping; its tests cover only that.
- [ ] No comment refers to a removed function.
- [ ] The Accounts invariant in the agent instructions is changed in one line, with the wording approved by the user before the edit.
- [ ] Full gate; no browser check needed (no behaviour change), stated as such.
