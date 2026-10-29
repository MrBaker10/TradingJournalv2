# 04: Decimal input with comma or dot

**What to build:** In every price and money field (trade prices, P&L override,
commission, ledger, account rules) a user can type a comma or a dot as decimal
separator. A thousands separator is refused, so `1.234` always means one point two
three four. One shared normaliser does this; the existing parsing uses it. Scale limits
and exact-decimal rules are unchanged. Independent of the interface language.

**Blocked by:** None (can start immediately).

Status: done

## Acceptance

- [x] `21234,50` and `21240.25` save as the same values a dot would give.
- [x] `1.234,5`, `1,234.5` and `1 234,5` are refused with the field's validation message.
- [x] Scale limits (four decimals for size, two for commission) still hold with a comma.
- [x] Existing tests for trade form and commission parsing extended with comma,
      dot and thousands cases; no assertion weakened.
- [x] Ordered verification gate passes; browser check: log a trade with comma prices,
      edit it, enter a ledger entry with a comma.

## Review

- Gate: lint, typecheck, test (107 files, 1649 tests, none skipped), build — green.
- `parseDecimalInput` (`src/lib/numbers.ts`) reads `,` or `.`, refuses thousands
  separators, spaces and exponents (NaN), empty is undefined. Used by the trade form
  payload (prices, contracts, P&L override, R fields, commission per account), the
  ledger amount, the account form (starting balance, per-side rate) and the account
  rules. Scale and exact-cent rules unchanged; the schema checks the parsed number.
- Trade schema: price, contracts, P&L override and R fields name the number format
  (`Enter the price as a number` …); English until ticket 05 turns them into keys.
- Agreed with the maintainer: Next on the execution step stops on unreadable text with
  the schema's message at the field (`unreadableInStep`), and such a step is not done;
  `missingInStep` reports empty fields only. The fixture `entryPrice: "abc"` in the
  missing test became `" "`; the unreadable case has its own tests.
- Agreed with the maintainer: `parseCommissionCents` stays unchanged — it reads broker
  CSV files and stored values, and import keeps its file format. The ticket's
  "commission parsing" criterion is covered by the typed commission in
  `form-steps.test.ts` (comma, thousands, two-decimal limit).
- Browser (production build on :3001, `REGISTRATION_OPEN=true` and
  `BETTER_AUTH_URL=http://localhost:3001` for that process, fresh test user on `/de`):
  starting balance `50000,50` saved as 50000.50; `1.234,5` as entry price stops Next on
  step 2 with the field message, nothing saved; entry `21234,50` / exit `21240.25`
  saved as 21234.5 / 21240.25; edit with exit `21241,75` saved; ledger `1.234,5`
  marked invalid, `149,95` saved. No console errors. Test users and their records were
  deleted after a DB query showed they were the only rows created since each run.
- Code review (standards + spec): fixed — pass-through `required` inlined, starting
  balance parsed once. Not changed: the name `parseNumber` (its JSDoc marks it for live
  figures), edit prefill shows stored values with a dot (accepted by the normaliser).
