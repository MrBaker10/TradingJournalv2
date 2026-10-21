# 03: Day total in the day heading

**What to build:** Each day heading shows the day's net P&L on the right, in mono, in
semantic green or red without glow, aligned with the row amounts below. The total covers
the whole day within the active filters, also across a page boundary. It is computed
with the same per-account contribution as the calendar's day totals: copy trades
multiplied by their real accounts exactly once, practice excluded in the combined view,
a selected practice account shown on its own, in the display currency. Without an
instrument filter it equals the calendar's day; with one it covers that instrument only.
A day with only missed setups shows no amount.

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 02

**Status:** done

- [x] Design.md first: the journal-list section fills in the total's slot (mono, semantic colour, no glow, aligned with the row amounts, absent on missed-only days).
- [x] Journal query's day values gain the net amount, built from the existing per-account contribution expression — no new money arithmetic, no `number` arithmetic on money.
- [x] DB tests: copy trade on two real accounts and one practice account; practice-only entry excluded from the combined value; selected practice account; instrument filter narrows the value; without an instrument filter the value equals the dashboard's day total for the same date; missed-only day has no amount.
- [x] Grouping tests extended: a missed-only day carries no amount.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, desktop and 390px: totals beside a calendar day on the dashboard agree; a red and a green day; an instrument filter; no horizontal scroll; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `42f7d54` (uncommitted diff).

- Deliberate, accepted by both reviews: the amount sums the row's own `tradeNetDisplayCents` rather than `moneyContribution`, because `scope.ts` already imports `trades.ts` and the reverse would be an import cycle. Under the list's visibility both reduce term by term to the same expression (multiplier, commission, practice, missed, currency); the header comment says why, and DB tests pin the parity.
- Fixed: a day of taken trades without an exit showed no amount while the calendar paints `$0.00`; it is now 0 (no amount stays reserved for missed-only days). Test written red first; §4.27 spells out both cases.
- Fixed: the calendar parity test had no commission and only "All accounts"; it now carries commissions on two real and one practice account, and a second parity case covers a selected account with a different commission on the other account.
- Fixed: the header comment states that the counts are count aggregates and the amount a money aggregate multiplied once.
- Open on purpose: zero is green, as in the row (§4.9), while the calendar paints a zero day muted; §4.27 says the heading follows the row. The sign-to-colour rule lives in several components with two zero rules; a shared helper would touch Analytics and the dashboard.
- Open on purpose: no parity case in a non-USD display currency; both expressions take the currency through the same `tradeDisplayCents`, and an EUR fixture needs ECB rates the fixture does not set up.
- Open on purpose: a missed-only day shows no amount in the journal while the calendar paints `$0.00`; that is the spec's rule ("A day with only missed setups shows no amount").
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (70 files, 1178 passed, none skipped), `pnpm build` all exit 0. Browser: all 13 October day totals of `/journal?from=2026-10-01&to=2026-10-31` equal the dashboard calendar (Fri 2 Oct +$268.00 with one of its two rows on page 1); Wed 14 Oct (missed only) without total; totals right-aligned with the row amounts (1033px); MES filter: Thu 15 Oct +$576.65, Mon 12 Oct without total; 390px one-line headings with total, no horizontal scroll; no console errors.
