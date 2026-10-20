# 03: Process summary of the review week

**What to build:** Beside the three fields the page shows a read-only summary of the
selected review week over all real accounts: logged days, the by-the-book share, the top
three mistakes with their counts and the number of missed setups. It is always computed
from the trades, so editing a trade updates past summaries. A week without trades shows a
calm empty state, and the review can still be written.

Spec: `.scratch/weekly-review/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01

**Status:** done

- [x] Summary aggregated in SQL in the `weekly-reviews` query module, scoped to all real accounts with the existing scope helpers; practice excluded; a trade on several accounts counts once.
- [x] Missed setups (`taken = false`) count as logged and as missed setups.
- [x] Empty state for a week without entries.
- [x] DB tests (executed): a Sunday trade belongs to the week it opens, a Saturday trade has no week effect; practice-only trades excluded; copy trade counted once; missed setups counted; top three mistakes ordered by count.
- [x] No effect on consistency score, streak or badges.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: summary for a week with trades and an empty week; no new console errors.

## Review

Two-axis review (standards, spec) against `4cfd7bf` on 2026-10-20, uncommitted tree.
No breach of a documented standard, no missing requirement.

Fixed:
- `TRADING_DAYS_PER_REVIEW_WEEK` moved from the card into `src/domain/review-week.ts`,
  with a Vitest case that derives it from the week range and `toTradingDay`.
- Top mistakes group by tag id and label, not by label alone.
- JSDoc of `getWeekSummary` states the asymmetry: by the book counts taken trades only
  (as on the dashboard), mistakes count every entry in scope, missed setups included.

Left as is:
- The three count expressions repeat `getCountMetrics` in `dashboard.ts`; sharing them
  means touching the dashboard query, a refactor outside this ticket.
- `tradingDay` (Sunday → Monday) vs. `ruleTradingDay` in `account-rules.ts`: different
  rule (that one also moves Saturday), so no shared helper.
- The summary fixture repeats the shape of `readFixture` in `dashboard.test.ts`;
  test-only duplication.
- Field names `takenTrades` / `byTheBookTrades` differ from `CountMetrics`; they follow
  `BadgeCounters.byTheBookTrades` and read clearly beside `missedSetups`.
- "Week boundaries in a non-UTC timezone" is covered by the week arithmetic (tickets
  01/02); the summary filters on `trade_date`, which no timezone touches.

Decided 2026-10-20 (Sascha): a logged day counts backfills; the 48-hour window belongs
to the streak only. GLOSSARY.md updated (Logged day, Streak).
