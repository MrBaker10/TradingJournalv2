# 05: Remove the unused multiplier functions and fix the pointers

**What to build:** The domain accounts module keeps only what production runs: grouping
accounts for the account switcher. The multiplier, practice exclusion and
aggregate-membership functions and their tests are removed. Comments that pointed to
them point to the scope module. The agent instructions name the scope module as the one
owner of every money and visibility expression.

Spec: `.scratch/money-scope/spec.md`. Terms: `GLOSSARY.md` → Real account, Practice account.

**Blocked by:** 02, 03, 04

**Status:** done

- [x] The domain accounts module exports only the switcher grouping; its tests cover only that.
- [x] No comment refers to a removed function.
- [x] The Accounts invariant in the agent instructions is changed in one line, with the wording approved by the user before the edit.
- [x] Full gate; no browser check needed (no behaviour change), stated as such.

## Review

Two-axis review of the working tree against `f7650cb`.

**Spec:** no missing or wrong requirement.
- The Accounts invariant in AGENTS.md is one bullet; with the approved wording it wraps over three physical lines instead of two.
- `context/coding-standards.md` line 225 named `src/domain/accounts.ts` as owner of the multiplier; it now names `src/db/queries/scope.ts` (wording approved; spec user story 20).

**Standards:** one finding, fixed.
- Fixed: `context/project-structure.md` still described `accounts.ts` as "assignment rules, per-account vs combined, multipliers". It now reads "account switcher grouping (money rules: db/queries/scope.ts)". The earlier grep searched for `domain/accounts` and missed this line, which names only the file.
- No live code, test or doc names a removed function; hits remain only in the append-only `context/decisions.md`/`context/history.md` and in `.scratch/` ticket history.
- No browser check: the removed functions had no production callers, so no behaviour changed.
