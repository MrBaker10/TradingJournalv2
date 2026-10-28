# 04: Analytics by account uses assignment money

**What to build:** The analytics split by account shows the same amounts as today, now
taken from the scope module as *assignment money*: one assignment's amount minus that
assignment's commission. The fan-out over assignments is the multiplier; nothing
multiplies a second time.

Spec: `.scratch/money-scope/spec.md`. Terms: `GLOSSARY.md` → Account scope, Copy trade.

**Blocked by:** 01

**Status:** done

- [x] Assignment money is part of the scope module's interface; analytics builds no money expression of its own.
- [x] Scope test: per account scope, assignment money summed over the in-scope assignments equals the summed figure money, commissions included.
- [x] Existing analytics tests unchanged and passing (none skipped).
- [x] Full gate; browser check of analytics "by account" with all accounts and with one account selected.

## Review

Two-axis review of the working tree against `bccabb1`.

**Spec:** no missing or wrong requirement.
- Beyond the named money view, deliberately: `assignmentInScope` (the `accounts` join condition) moved into the scope module too. Which assignments are joined decides the fan-out, i.e. the multiplier, and the spec gives the module "the per-account visibility".
- Kept, against the suggestion to revert it: the `"USD"` default on the private `assignmentCommissionCents`. Both reviews call it unused, but `assignmentMoney` passes `scope.currency`, which is optional; the default replaces a `?? "USD"` at the call site and matches its siblings.

**Standards:** no hard violation. Judgement calls, left open on purpose:
- `getStartingBalanceCents` in `dashboard.ts` repeats the ternary `assignmentInScope` now owns (real accounts or the selected one), over `DashboardScope`. Outside this ticket; a follow-up candidate.
- `assignmentMoney` only holds together with the `trade_accounts` join narrowed by `assignmentInScope`; the join recipe now appears in analytics and in the scope test. Bundling them is worth it once a third caller appears.
- `assignmentInScope` returns `SQL`, its sibling `assignedToAccount` `SQL<boolean>`. Cosmetic.
