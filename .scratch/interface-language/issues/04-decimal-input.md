# 04: Decimal input with comma or dot

**What to build:** In every price and money field (trade prices, P&L override,
commission, ledger, account rules) a user can type a comma or a dot as decimal
separator. A thousands separator is refused, so `1.234` always means one point two
three four. One shared normaliser does this; the existing parsing uses it. Scale limits
and exact-decimal rules are unchanged. Independent of the interface language.

**Blocked by:** None (can start immediately).

Status: ready-for-agent

## Acceptance

- [ ] `21234,50` and `21240.25` save as the same values a dot would give.
- [ ] `1.234,5`, `1,234.5` and `1 234,5` are refused with the field's validation message.
- [ ] Scale limits (four decimals for size, two for commission) still hold with a comma.
- [ ] Existing tests for trade form and commission parsing extended with comma,
      dot and thousands cases; no assertion weakened.
- [ ] Ordered verification gate passes; browser check: log a trade with comma prices,
      edit it, enter a ledger entry with a comma.
