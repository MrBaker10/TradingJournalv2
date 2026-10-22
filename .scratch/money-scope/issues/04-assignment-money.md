# 04: Analytics by account uses assignment money

**What to build:** The analytics split by account shows the same amounts as today, now
taken from the scope module as *assignment money*: one assignment's amount minus that
assignment's commission. The fan-out over assignments is the multiplier; nothing
multiplies a second time.

Spec: `.scratch/money-scope/spec.md`. Terms: `GLOSSARY.md` → Account scope, Copy trade.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Assignment money is part of the scope module's interface; analytics builds no money expression of its own.
- [ ] Scope test: per account scope, assignment money summed over the in-scope assignments equals the summed figure money, commissions included.
- [ ] Existing analytics tests unchanged and passing (none skipped).
- [ ] Full gate; browser check of analytics "by account" with all accounts and with one account selected.
