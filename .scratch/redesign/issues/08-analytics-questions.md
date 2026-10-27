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

**Status:** ready-for-agent

- [ ] The analytics query hands the per-bucket count of trades with an R to the page for every dimension, aggregated in SQL and scoped like the queries beside it; a query test against Postgres covers the count with and without R values and with practice excluded.
- [ ] Ranking shows only buckets with at least three R trades across all dimensions except account, ordered by avg R, with R, n and net P&L on each row; the threshold is a domain function with tests.
- [ ] Weekday and hour columns start from a zero line placed by the ratio of the largest gain to the largest loss; bucket order and zero-line placement are domain functions with tests; a page of only gains is not half empty.
- [ ] Each question shows its dimensions as small cards with top buckets, net P&L, avg R and a thin bar; "Not set" shows its figures without a bar and does not set the scale.
- [ ] A card, a ranking row and a column open the wide sheet with zero-line bars, the full table and the metric switch; switching the metric changes the sheet only; Esc closes it.
- [ ] Execution figures show winners against losers with a legend; post-exit moves are labelled hypothetical; missed setups show counts and shares and no P&L.
- [ ] Table of contents follows the scroll with an intersection observer and hides below `lg`.
- [ ] Money in sign colour only; no bucket, row or card is styled as a winner; the range filter keeps its search parameters.
- [ ] Old analytics components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, change the range, open a card sheet, switch the metric, open a column sheet, Esc, use the table of contents; reduced motion emulated once; no new console errors.

## Do not build

- New metrics, dimensions or filters; the eleven dimensions are regrouped, not changed.
- A metric switch on the overview.
- Sorting or ranking by account.
