# 08: Analytics in six questions

**What to build:** Analytics reads as an analysis organised by six questions in order:
what holds results up and drags them down; when do I trade well; what am I trading and
how; how do I execute; what gets in my way; where do I hesitate. Every one of the eleven
dimensions belongs to one question. The first answer ranks buckets by avg R across all
dimensions except account, only where at least three trades had an R, and shows R, its
n and net P&L together. Weekday and hour are columns from a zero line placed by the
ratio of the largest gain to the largest loss. Inside a question the dimensions are small
cards side by side: top buckets, net P&L with avg R beside it, a thin bar under each row;
the bar scale excludes "Not set", which shows its figures without a bar. A click on a
card, a ranking row or a column chart opens the wide sheet with zero-line bars, the full
table and the metric switch; the overview has no switch. Execution shows winners against
losers with a legend and calls post-exit moves hypothetical. Missed setups show counts
and shares only. A table of contents of the questions follows the scroll. Money is in
sign colour only; nothing is highlighted as a winner.

Spec: `.scratch/redesign/spec.md` → Analytics, Reading and charts pattern. Design:
`context/Design.md`. Source: the winning view on `prototype/redesign-analytics` and
the verdict in its commit body; rewrite, do not copy.

**Blocked by:** 05 (Detail sheet and trade detail page)

**Status:** done

- [x] The analytics query hands the per-bucket count of trades with an R to the page for every dimension, aggregated in SQL and scoped like the queries beside it; a query test against Postgres covers the count with and without R values and with practice excluded.
- [x] Ranking shows only buckets with at least three R trades across all dimensions except account, ordered by avg R, with R, n and net P&L on each row; the threshold is a domain function with tests.
- [x] Weekday and hour columns start from a zero line placed by the ratio of the largest gain to the largest loss; bucket order and zero-line placement are domain functions with tests; a page of only gains is not half empty.
- [x] Each question shows its dimensions as small cards with top buckets, net P&L, avg R and a thin bar; "Not set" shows its figures without a bar and does not set the scale.
- [x] A card, a ranking row and a column open the wide sheet with zero-line bars, the full table and the metric switch; switching the metric changes the sheet only; Esc closes it.
- [x] Execution figures show winners against losers with a legend; post-exit moves are labelled hypothetical; missed setups show counts and shares and no P&L.
- [x] Table of contents follows the scroll with an intersection observer and hides below `lg`.
- [x] Money in sign colour only; no bucket, row or card is styled as a winner; the range filter keeps its search parameters.
- [x] Old analytics components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, change the range, open a card sheet, switch the metric, open a column sheet, Esc, use the table of contents; reduced motion emulated once; no new console errors.

## Do not build

- New metrics, dimensions or filters; the eleven dimensions are regrouped, not changed.
- A metric switch on the overview.
- Sorting or ranking by account.

## Review

Gates on the final tree: `pnpm lint`, `pnpm typecheck`, `pnpm test` (89 files, 1421
tests, none skipped) and `pnpm build` pass. Browser click path with Playwright against
the demo user at 1440 px and 390 px, plus once with reduced motion: 48 checks pass
(six questions, ranking rows with R, n and P&L, a card, a column chart and a ranking row
open the sheet, the metric switch changes the sheet only, Esc closes and returns focus,
keyboard focus ring, sheet at `max-w-3xl`, table of contents follows the scroll and
hides below `lg`, preset and typed dates keep their search parameters, no horizontal
scroll). No console error and no hydration warning. The click path writes nothing.

- Agreed before implementation: "How do I execute?" keeps both the MAE and the MFE
  distribution in a 2×2 grid with hold time and exit efficiency; prototype D showed
  MAE only.
- The query already counted trades with an R per bucket; `DimensionRow.rCount` now
  hands it to the page. Query tests added for a bucket without stops, a copy-trade and
  a practice-only trade; the query itself is unchanged.
- Domain rules with tests in `src/domain/analytics.ts`: `rankBuckets` (three trades
  with an R, account and Not set left out, five per side), `ANALYTICS_QUESTIONS` (each
  dimension in exactly one question), `columnOrder`, `zeroLineLayout` (one function for
  the columns and the sheet's bars), `sortByMetric`; Not set is out of the bar scale
  (`barRatio: null`). Column placement in `src/lib/analytics/columns.ts`, formatting in
  `src/lib/analytics/format.ts`, both tested.
- Weekday and hour never have a Not set bucket: `trade_date` and `entry_time` are
  required.
- Fixed from review: the sheet uses its own `analytics` size (`lg:max-w-3xl`, Design
  §3.10); metric switch and range presets are `ui/toggle`; chart geometry moved out of
  the components; focus ring on everything that opens the sheet; a missing hold time
  draws no bar; question hints live with the questions; the ranking gives the bucket
  name the row's width; table header cells padded.
- Fixed after the user's check: the last questions are too short to reach the upper
  third the observer watches, so the mark stopped early and the table of contents could
  not bring them to the top. A first fix (mark the last question at the bottom of the
  page) skipped "What gets in my way?" and left the lower entries unclickable; it was
  replaced, as the user chose, by giving the last question at least a screen of height
  from `lg`. Checked with Playwright at 1000 px and 800 px window height: scrolling down
  marks all six questions in order, and from the bottom every entry brings its question
  to the top and marks it.
- Decided by the user after review: the account sheet keeps the net P&L order
  whatever the metric switch shows (`detailOrder`, Do not build: sorting or ranking by
  account); winners and losers in "How do I execute?" are two strengths of one neutral,
  because the sign colours belong to money (Design §2); Design §4 gains the rule that a
  page with a scroll-following table of contents gives its last section at least a
  screen of height.
- Removed with their last use: `bucket-table`, `dimension-table`, `empty-section`,
  `exit-efficiency-card`, `hold-time-card`, `missed-setups-section`,
  `risk-calibration-card`, `ui/value-bar` and `--color-bar-track`.
- Kept from the prototype: five buckets per ranking side, five rows per card by net
  P&L, the "With R" column in the sheet table (the n behind avg R).
- Open: the signed-R formatter now exists in `lib/analytics/format.ts` and three
  journal/dashboard components; `AnalyticsPage` and the sheet body are long.
