# Spec: Design round Progress and Analytics

Status: ready-for-agent

Roadmap: `context/project-overview.md` → Future, "Component-level design for Analytics"
and `context/Design.md` §10 (Progress and Analytics "tragfähig, aber nicht entworfen").
Terms: `GLOSSARY.md`. Decided in a grilling session with prototypes on 2026-10-20/21.

## Problem Statement

Progress and Analytics were built from existing primitives and never held against the
other screens. Progress has no clear weight: the grace-day bar sits in one column, the
streak card looks different from the dashboard tile, earned badges glow brighter than
their text, an explanatory hint is amber, and an empty "Past months" takes a full card.
Analytics shows eleven identical cards with no hierarchy; in real data five or six
dimensions hold nothing but "Not set" and still take a full card each, the two-column
grid leaves large holes, empty execution sections fill the screen with empty cards, the
missed setups are the only section without a surface, and on a phone the bucket names
are cut to "Luci…", "Lon…" or "Not …".

## Solution

A design round that changes presentation only. The dashboard is the yardstick
(Design.md §1, §4.7, §4.14); every decision is checked on desktop and at 390px.

Progress becomes score-first: the grace-day bar across the full width, then the month's
consistency score as the main card with compact status cards for streak and badges and
the weekly-review card beside it, the streak rules folded away underneath, then past
months and badges. Earned badges move to the calm surface.

Analytics becomes one gap-free two-column masonry of the dimensions that hold data; the
ones that hold only "Not set" collapse into one line that still names them. The Avg R
dash is explained once. Rows go two-line on a phone so the bucket name is readable. The
table layout lives in one component. Empty execution sections and the missed setups get
calm, compact treatment. No charts.

## User Stories

1. As a trader, I want Progress to show this month's consistency score as its main element, so that I see first what the page is about.
2. As a trader, I want the score breakdown into showing up, journaling, plan adherence and review habit next to the score, so that I know what to improve.
3. As a trader, I want my logging streak and longest streak as a compact status card beside the score, so that I see it without it competing with the score.
4. As a trader, I want my badge count as a compact status card beside the score, so that I see my progress at a glance.
5. As a trader, I want the weekly-review entry next to the status cards, so that the weekly habit sits with the other habits.
6. As a trader, I want the score shown once on Progress, not twice, so that the page does not repeat itself.
7. As a trader, I want the grace-day notice across the full width above everything, so that I read it before the numbers it explains.
8. As a trader, I want the streak rules folded away but one click away, so that they do not take space I rarely need.
9. As a trader, I want past months below the current month, so that what is running comes before the look back.
10. As a trader, I want an empty "Past months" to take one line, so that a new user's page is not dominated by an empty card.
11. As a trader, I want earned badges to look calm, so that the badge tile is never brighter than the badge it labels.
12. As a trader, I want earned and open badges still clearly different, so that I see what I have earned.
13. As a trader, I want the "evaluated once the month is over" hint in a neutral colour, so that amber keeps meaning rule limits and practice accounts.
14. As a trader on a phone, I want the score card first on Progress, so that the main thing is at the top of a narrow screen.
15. As a trader, I want the Progress status cards to read as a smaller form of the dashboard tiles, so that both pages feel like one product.
16. As a trader, I want Analytics to show only dimensions that hold data as cards, so that I am not scrolling past empty tables.
17. As a trader, I want the dimensions with nothing recorded named in one line, so that I know they exist and that I have not filled them.
18. As a trader, I want a dimension with at least one set bucket to keep its card, so that a little data is never hidden.
19. As a trader, I want the Analytics cards to fill two columns without holes, so that the page reads as one surface.
20. As a trader, I want the dimension order to stay the same as today, so that I find a dimension where I expect it.
21. As a trader, I want one explanation when no trade in the range has a stop price, so that the "—" under Avg R in every card makes sense.
22. As a trader, I want no Avg R explanation when some trade has an R, so that the page does not tell me something untrue.
23. As a trader on a phone, I want a bucket name in full length on its own line with the four figures below, so that I can read which bucket a row is.
24. As a trader on a phone, I want the column labels once per card above the rows, so that I know which figure is which.
25. As a trader, I want every Analytics table to look and behave the same, so that I read one, I can read all.
26. As a trader, I want the eight-rows-then-"Show all" behaviour kept, so that long dimensions stay short without hiding anything.
27. As a trader, I want an empty execution section to say in one compact line why it is empty, so that four empty cards do not fill the screen.
28. As a trader, I want the missed setups in a card like every other section, so that they look like an equal part of the page.
29. As a trader, I want money in Analytics to stay semantic green and red without glow, and process values to stay neon, so that the page keeps the app's colour rule.
30. As a trader, I want horizontal bars, not charts, in Analytics, so that the page stays calm and every figure stays next to its number.
31. As a trader, I want the range filter and the account switcher to behave exactly as today, so that the round changes what I see, not what is counted.
32. As a trader, I want no horizontal scrolling on either page at phone width, so that the pages work on my phone.

## Implementation Decisions

- **Presentation only.** No new figures, queries, schema, migrations or product rules.
  Every number on both pages is computed as today.
- **Progress layout (prototype variant B, chosen 2026-10-21).** Order: unlocked-badge
  card (as today), grace-day bar full width (§4.4, no longer inside the streak card),
  then two columns from `lg` at 3 : 2 — left the score breakdown card, right a column of
  compact status cards for streak and badges plus the weekly-review card. Below that the
  streak rules as a closed disclosure, then past months, then badges. Below `lg` one
  column, score card first.
- **Compact status card.** A new, documented small form of the §4.3 tile: `card-surface
  edge-neon`, cap label left, value in mono with `text-glow` and its sub-line on one row
  right, no icon tile. The dashboard keeps its §4.3 tiles unchanged. Progress no longer
  shows a consistency tile, because the breakdown card carries the score.
- **Streak card split.** The grace-day bar and the streak rules leave the streak card;
  the rules wording stays verbatim from the product rules.
- **Badges.** Earned badges use the calm process surface of §4.14 (soft gradient, 1px
  inset in the accent, no outer glow, cyan icon); open badges stay matte. The
  "evaluated once the month is over" hint moves from amber to the subtle text colour.
- **Past months.** Without a frozen month the card shrinks to one compact line.
- **Analytics layout (prototype variant B, chosen 2026-10-21).** One two-column masonry
  (CSS columns, cards kept whole) of the dimensions that hold data, in today's dimension
  order; one line "Not recorded in this range" naming the rest. Range filter, account
  scope and the eight-row limit stay as they are.
- **Recorded vs. not recorded** is decided in the pure analytics domain module: a
  dimension is not recorded when it has no rows or only the "Not set" bucket. The same
  module decides whether the Avg R note shows (no bucket in any dimension has an Avg R).
- **One table row component** for every table on Analytics (dimensions, execution,
  missed setups), so the copies of the row layout there become one. "Past months" on
  Progress (§4.24 calls it the sixth copy) moves onto it only if it fits without a
  special case; otherwise it stays and the review notes why. Below `sm` a row is two lines: the bucket
  name in full, then the figures; the column header becomes one combined label line.
- **Execution sections.** When a section has nothing recorded it shows one compact empty
  line instead of its cards; the explanatory empty texts stay.
- **Missed setups** sit in a `card-surface edge` card, empty state included.
- **No charts.** The 3px value bar stays the only visual primitive on Analytics.
  Design.md §10 records the bar-chart question as decided.
- **Design.md first.** §4.3 (compact status card), §4.4, §4.14, §4.16, §4.17, §4.24 and
  §10 are updated before the UI of each ticket; the prototypes were thrown away and
  never committed.

## Testing Decisions

- A good test checks behaviour through the public interface of the pure module, with
  expected values written out by hand, never recomputed the way the code does it.
- **Seam: the pure analytics domain module** (prior art: the existing analytics domain
  tests). Cases: all dimensions recorded; a dimension with no rows; a dimension with only
  "Not set"; a dimension with one set bucket beside "Not set" stays recorded; dimension
  order preserved in both lists; Avg R note shown when no bucket has an Avg R, hidden as
  soon as one has.
- No component tests and no DB tests: no query changes, and the project has no
  component test harness.
- Full gate from `context/ai-interaction.md` per ticket, plus browser checks on desktop
  and at 390px (iframe method): Progress with and without a grace day, with an empty and
  a filled month, empty past months, earned and open badges; Analytics with recorded and
  unrecorded dimensions, "Show all", a narrow row, empty execution sections, missed
  setups; no horizontal scroll, no new console errors.

## Out of Scope

- New metrics, dimensions, badges (including a weekly-review badge) or score changes.
- Charts or Recharts on Analytics; per-account equity curves.
- Changes to the dashboard's tiles or metric panel.
- Prop Firm Rules design (it stays on the roadmap's Future list).
- Light mode.
- Changes to the range filter, the account switcher or the journal-filter drilldown.

## Further Notes

- Prototype verdicts (2026-10-21): Progress B over A (dashboard tiles plus two detail
  cards — showed the score twice) and C (main column plus sticky status column — tall
  on a phone); Analytics B over C (grouped Where/When/What/How — most groups held a single
  card, leaving half-empty rows, and "How" was empty in real data).
- Settled earlier in the session: Progress before Analytics, dashboard as yardstick,
  presentation only, mobile included.
