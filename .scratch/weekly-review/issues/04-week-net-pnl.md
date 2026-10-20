# 04: Net P&L in the week summary

**What to build:** The week summary adds the week's Net P&L over all real accounts as a
neutral money figure in the "All accounts" display currency — shown, not celebrated.

Spec: `.scratch/weekly-review/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 03

**Status:** done

- [x] Net P&L aggregated in SQL with the existing scope and money helpers: money multiplied exactly once by the real-account count, practice excluded, currency conversion per the existing display-currency rule.
- [x] Missed setups never contribute to Net P&L.
- [x] Neutral semantic money colour, no glow.
- [x] DB tests (executed): copy trade across real and practice accounts multiplies by real accounts only; missed setup excluded; matches the dashboard's Net P&L for the same range.
- [x] Gates from `context/ai-interaction.md`.
- [ ] Browser: Net P&L for a week with a copy trade; no new console errors. (Partial, see Review: local data has no copy trade.)

## Review

Two-axis review (standards, spec) against `ad4a80a` on 2026-10-20, uncommitted tree.
No correctness defect in the money path.

Fixed:
- `getWeekSummary`'s header named it a count aggregate only; it now states both parts
  (counts unmultiplied, `netPnlCents` a money aggregate via `moneyContribution`), as
  coding-standards.md → Money requires.
- `WeekScope` is `Pick<QueryScope, "userId" | "currency">` instead of copying fields.

Left as is:
- The Net P&L select repeats `getMoneyMetrics`'s sum; calling it would compute six
  unused aggregates. The executed parity test (USD and EUR) pins both to one value.
- `formatCents(..., { signed: true })` beside metric-panel's private `money()`: one
  call site, never null here.
- `withDisplayCurrency` runs before the other reads, as on the dashboard page.
- Colour: "neutral" read as "not celebrated" — semantic green/red, white at 0, no glow,
  per AGENTS.md ("Money gets semantic colour, no glow or celebration") and Design.md §1;
  recorded in §4.26.

Browser: Net P&L checked on week 2026-09-20 (+$418.30, equal to the sum of the 12
journal entries, success colour, no glow, no console errors). The local data has no
trade copied onto two real accounts, so the copy-trade case is covered by the executed
DB tests only.
