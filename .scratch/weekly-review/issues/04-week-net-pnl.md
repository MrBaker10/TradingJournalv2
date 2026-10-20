# 04: Net P&L in the week summary

**What to build:** The week summary adds the week's Net P&L over all real accounts as a
neutral money figure in the "All accounts" display currency — shown, not celebrated.

Spec: `.scratch/weekly-review/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Net P&L aggregated in SQL with the existing scope and money helpers: money multiplied exactly once by the real-account count, practice excluded, currency conversion per the existing display-currency rule.
- [ ] Missed setups never contribute to Net P&L.
- [ ] Neutral semantic money colour, no glow.
- [ ] DB tests (executed): copy trade across real and practice accounts multiplies by real accounts only; missed setup excluded; matches the dashboard's Net P&L for the same range.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: Net P&L for a week with a copy trade; no new console errors.
