# Spec: Redesign

Status: ready-for-agent

Roadmap: replaces the visual language of `context/Design.md` (ADR 0004). Terms:
`GLOSSARY.md`. Decided in seven prototype rounds on 2026-10-26 and 2026-10-27; every
verdict is recorded in the commit body of its prototype branch (see Further Notes) and
in `handoffs/HANDOFF-2026-10-26-redesign-prototype.md`.

## Problem Statement

The app's visual language was written for a marketing site: neon and glow, navy and
azure, gradient tiles, a card around everything. Built screen by screen over twenty-nine
design rounds, the pages never held together. Logging a trade is a wall of fields with
five card sections. Analytics is eleven tables and three cards, each a wall of its own.
Progress has no place where a badge, a streak or a review feels like anything. Settings
edits an account inline, in the list, with a disclosure inside a disclosure. Prop Firm
Rules is a column of firm cards that all expand the same way. Nothing on any page tells
the trader where the detail opens, whether in place, on a page or in a sheet. Save
feedback repeats the trade's result ("+$800.00, +2.00R"), so a losing trade and a
winning trade are confirmed differently. Hover and press states are inconsistent, some
in CSS, some in `motion`, some missing. The hand-built primitives carry their own
accessibility code and drift from each other. On a phone the shell works (mobile-shell)
but the pages do not.

## Solution

One design across every page: calm and precise at rest, responsive on every
interaction, modelled on the Stripe dashboard. Shadcn/ui on Base UI replaces the
hand-built primitives. The mission, the feature set, "Not Building" and dark-only mode
are unchanged.

Seven prototypes settled the shape of every pattern in the app:

| Pattern | Settled by | Verdict |
|---|---|---|
| Shell: navigation, palette, practice marker | Dashboard round | Collapsible grouped sidebar, ⌘K, fog |
| Overview: calendar, process and money figures | Dashboard round | Month calendar first, orb, mono money |
| Dense lists and detail | Journal round | Day log, wide detail sheet, full page |
| Forms and entry | Trade form round | Steps with feedback on every pick |
| Process metrics and process moments | Progress round | Orb and score ring, heatmap, badge list |
| Reading and charts | Analytics round | Questions, small multiples, detail sheet |
| Many sections, editing one entity | Settings round | One page, table, editor sheet in the URL |
| Reference catalogue | Prop firm round | Size first, cards, firm page in a sheet |

Pages without a prototype (Ledger, Econ Calendar, Strategies, Import, Weekly Review,
trade detail page and edit, Login and Register) are built from these patterns, as
stated under Implementation Decisions. The prototypes are rewritten, not copied: the
`prototype/*` branches are the primary source, `main` receives only the decisions.

## User Stories

### Shell

1. As a trader, I want the navigation grouped into Daily, Review and Set up, so that the pages I open every day stand apart from the ones I open to review or configure.
2. As a trader, I want to collapse the sidebar to an icon rail with tooltips, so that a dense page like Analytics gets the width.
3. As a trader, I want the sidebar's collapsed state remembered on this browser, so that I set it once.
4. As a trader, I want a command palette on ⌘K that opens pages, runs actions and switches accounts, so that I never leave the keyboard.
5. As a trader, I want "Log trade" as the one filled primary button in the shell, reachable with the key `C`, so that logging is always one action away.
6. As a trader, I want the key `[` to toggle the sidebar, so that I need no mouse for it.
7. As a trader, I want a soft amber fog over the content area while a practice account is selected, so that I always know I am looking at simulated figures, without a hard edge that competes with the content.
8. As a trader on a phone, I want the existing top bar and drawer kept and restyled, so that the mobile shell behaves as it does today.
9. As a trader, I want every shortcut to stay out of the way while I type in a field, so that `C` and `[` never fire inside a form.

### Dashboard

10. As a trader, I want the month calendar as the main area of the dashboard, so that the month's shape is the first thing I see.
11. As a trader, I want each day tinted green or red by the sign of its net P&L only, never by its size, so that a big day does not shout.
12. As a trader, I want a day to lift on hover above its neighbours, so that I can read it in isolation.
13. As a trader with reduced motion, I want the hover to show a shadow only, so that nothing moves.
14. As a trader, I want the streak orb, the process metrics, the pre-market plan and the daily checklist in the right column, so that the process sits beside the month.
15. As a trader, I want the money metrics as a mono key/value list below the calendar, so that they align as a column and glow nowhere.
16. As a trader, I want the equity curve and the recent entries below the metrics, so that the page reads from month to detail.
17. As a trader, I want a ticked checklist step struck through as if by a pen, one line after another at a constant pen speed, so that ticking feels done.
18. As a trader, I want unticking to remove all strike lines at once, so that undo is quick and not a show.
19. As a trader, I want the streak orb to gather its points and turn once when a process moment occurs, then rest, so that a moment is marked and the page stays calm.

### Journal

20. As a trader, I want the journal as a day log, one section per trade date with a sticky date column, so that I read my week as a diary.
21. As a trader, I want the date column to show weekday, date, entry count, missed count and the day's net P&L, so that the day's shape is in one place.
22. As a trader, I want a time strip of the day's entries on the chart clock, with dots coloured by sign and missed setups grey, so that I see when I traded.
23. As a trader, I want each entry as a card with the first screenshot, a notes excerpt, confluences and mistakes, so that an entry is recognisable without opening it.
24. As a trader, I want an entry without a screenshot to show no empty image field, so that the card does not advertise what is missing.
25. As a trader, I want the journal as a flat list when sorted by R, so that the best and worst trades are not torn apart by day headings.
26. As a trader, I want one "Filter" menu for range, instrument and sort, so that the filters weigh less than the entries.
27. As a trader, I want instruments grouped by asset class in the filter, so that I find a symbol among many.
28. As a trader, I want a click on an entry to open a wide detail sheet over the log, with execution and process side by side, accounts, confluences and mistakes, notes, screenshots with lightbox and links with preview, so that I never lose my place in the diary.
29. As a trader, I want "Open page" and "Edit" at the top of the detail sheet, so that the full page and the form are one click away.
30. As a trader, I want a full detail page at the trade's own URL, so that a trade can be linked and bookmarked.
31. As a trader, I want counts and never a money total for a filtered range, so that a range's total stays on the dashboard and in Analytics.
32. As a trader, I want missed setups in the same structure as trades, only marked, so that they count as entries in their own right.

### Trade form

33. As a trader, I want to log a trade in five steps (What, Execution, Why, Reflect, Evidence), so that a wall of fields becomes a walk.
34. As a trader, I want the required fields in the first two steps only, so that a quick entry stays quick.
35. As a trader, I want "Log now" from the third step on, so that I can skip the review when I have no time.
36. As a trader, I want Enter to move to the next step and ⌘↵ to log, so that the keyboard carries me through.
37. As a trader, I want every choice as loose buttons, not a rigid segmented bar, so that each pick is its own target.
38. As a trader, I want a shared highlight to spring to my pick, the button to give under the press and a check to pop in, so that every pick answers me.
39. As a trader, I want a second click on a chosen option to clear it, so that every optional choice can be undone.
40. As a trader, I want two-way answers (taken or missed, long or short) as two large cards with a hint, so that the most important choice is the biggest.
41. As a trader, I want the grade as round buttons A to F, so that grading feels like marking.
42. As a trader, I want confluences, mistakes and accounts as chips that bounce when toggled and show a check, so that a many-of choice reads at a glance.
43. As a trader, I want my practice account not preselected and marked with the amber stripe, so that a real trade never lands on it by accident.
44. As a trader, I want the step rail to echo what I have answered under each step, so that I see the trade take shape.
45. As a trader, I want a finished step to get a check in the rail, so that I know what is done.
46. As a trader, I want steps to slide in the direction of travel and a progress bar to fill, so that moving on feels like moving on.
47. As a trader, I want missing required fields to shake once and be named, so that I see what is still needed without reading red text.
48. As a trader, I want live P&L and R shown only while I type, in sign colour, so that the figure is information and not a reward.
49. As a trader, I want saving to draw a check and say "Trade logged" or "Missed setup logged", never the result, so that a loss and a win are confirmed alike.
50. As a trader, I want "Log another" and "View in journal" after saving, so that the next action is one click away.
51. As a trader, I want to paste a screenshot with ⌘V anywhere on the Evidence step, so that evidence costs nothing.
52. As a trader, I want links accepted only with https, so that the journal never holds an insecure link.
53. As a trader, I want entry to stay its own page, also from the journal, so that there is one way to log.
54. As a trader with reduced motion, I want the colours of every pick without the springs, slides and shakes, so that feedback is still there.

### Progress

55. As a trader, I want the streak as the orb with this week's days under it, so that the streak has a body.
56. As a trader, I want the consistency score as a ring of its four parts with a legend and the logged trading days, so that I see what the score is made of.
57. As a trader, I want a card for this week's review with "Write review", so that the habit has a place.
58. As a trader, I want "Next up" with the three badges closest to being earned and their progress, so that I know what I am working towards.
59. As a trader, I want a heatmap of logged trading days over 26 weeks, with the grace day dashed and today outlined, so that I see my showing up at a glance.
60. As a trader, I want the badges as a list by category with the date earned or the progress, so that a badge is a record and not a trophy case.
61. As a trader, I want a process moment to gather the orb, pulse the day in the heatmap once and sweep light over the new badge row once, so that the moment is marked in proportion.
62. As a trader, I want nothing on Progress to move at rest, so that the page is calm until something happens.
63. As a trader, I want "Write review" to lift on hover with its arrow moving, so that the one action on the page answers the pointer.

### Analytics

64. As a trader, I want Analytics organised by six questions instead of eleven dimensions, so that the page reads as an analysis.
65. As a trader, I want "What holds my results up, what drags them down?" ranked by avg R across every dimension, so that the strongest and weakest buckets stand out.
66. As a trader, I want that ranking to include only buckets where at least three trades had an R, and to show R, its n and P&L together, so that a bucket never looks strong on a single trade or contradicts its own money figure.
67. As a trader, I want weekday and hour as columns from a zero line placed by the ratio of gains to losses, so that a page of mostly gains is not half empty.
68. As a trader, I want the dimensions inside each question as small cards side by side, net P&L with avg R beside it and a thin bar under each row, so that patterns across dimensions jump out.
69. As a trader, I want a click on a card, a ranking row or a column chart to open a wide detail sheet with zero-line bars, the full table and a metric switch, so that depth is one click away and the overview stays simple.
70. As a trader, I want the metric switch only in the sheet, so that the overview has one reading.
71. As a trader, I want "Not set" excluded from the bar scale and shown as a number only, so that the real buckets are not dwarfed.
72. As a trader, I want a table of contents of the questions that follows my scroll, so that a long page stays navigable.
73. As a trader, I want the execution figures as winners against losers with a legend, and post-exit moves marked hypothetical, so that no hypothetical gain reads like a gain.
74. As a trader, I want missed setups as counts and shares only, never P&L, so that where I hesitate stays a process question.
75. As a trader, I want money in sign colour only, nothing highlighted as a winner, so that the analysis never rewards an outcome.

### Settings

76. As a trader, I want Settings as one page with Accounts, Checklist, Data and Security, and a table of contents that follows my scroll, so that I find a setting without clicking through tabs.
77. As a trader, I want my accounts as a dense table with currency, starting balance, prop firm with its rule dot and the practice stripe, so that all accounts read at a glance.
78. As a trader, I want a click on an account row to open its editor in a sheet with details, commissions and prop firm link stacked, so that one account is edited in one place.
79. As a trader, I want every account listed under Accounts in the table of contents with its stripe and rule dot, so that I can jump to one.
80. As a trader, I want previous and next in the sheet header with a position count, and ↑/↓ doing the same, so that I move through my accounts without closing the sheet.
81. As a trader, I want the open account in the URL, so that a link from the dashboard's rule-status card opens the right sheet and a reload keeps it.
82. As a trader, I want Esc to close the sheet and clear the URL, so that the page is clean again.
83. As a trader, I want the checklist template in three columns with add on Enter and remove on hover, so that maintaining my routine is quick.
84. As a trader, I want export and security as plain rows with one action each and the danger zone set apart, so that the rare actions are findable and the destructive one is unmistakable.
85. As a trader, I want "Add account" and archived accounts under the table, so that the list stays about the active accounts.

### Prop Firm Rules

86. As a trader, I want to start from the account size I want, so that the catalogue answers "which firm at 50k?".
87. As a trader, I want the size preselected to the one a linked account is on, else "Any size", so that my own program is in view first.
88. As a trader, I want every firm's program at that size as a card with six key figures (size, target, max drawdown, daily loss, min days, split) and its tags, so that the offers compare at a glance.
89. As a trader, I want programs my accounts are linked to first, carrying the account's name, so that I see my own program among the rest.
90. As a trader, I want a card to open the firm's page in a sheet with website, verified date and all 18 rules, so that the detail is one click away.
91. As a trader, I want the firm's program switcher in the sheet head, so that 50k to 100k of the same firm is one click without closing.
92. As a trader, I want to put up to three programs into a compare panel above the cards, side by side and verbatim, so that I compare without leaving the grid.
93. As a trader, I want a dot on compare rows whose wording differs, so that I find the differences without reading every cell.
94. As a trader, I want a missing rule to read "Not recorded", so that the app never invents a rule.
95. As a trader, I want the filters and the compare selection in the URL as today, so that a reload and a shared link show the same view.

### Pages built from the patterns

96. As a trader, I want the Ledger, the Econ Calendar and the Strategies list as dense tables in the journal's table pattern, with a detail sheet where there is a detail, so that lists read the same everywhere.
97. As a trader, I want the ledger entry form, the weekly review and the import flow built from the trade form's blocks (loose choices, chips, cards, the same save feedback), on one page rather than in steps, so that every form answers the same way.
98. As a trader, I want the trade edit form to be the trade form's steps with every answer prefilled, so that editing is logging again.
99. As a trader, I want Login and Register as calm single cards in the same tokens, so that the first screen matches the rest.
100. As a trader, I want the weekly review's summary beside the form as a mono key/value list, with net P&L as a neutral figure, so that the summary reads like the dashboard's metrics.

### Across the app

101. As a trader, I want every save, delete and import confirmed as the action, never as the outcome, so that feedback looks the same for a winning and a losing trade.
102. As a trader, I want every button, chip and row to answer within 100 ms with a small change of colour, lift or scale, so that the app feels alive without moving.
103. As a trader, I want expressive animation only at process moments, in proportion to the moment, so that a badge feels earned and a green day feels like nothing.
104. As a trader, I want every detail sheet to slide fully in from the right over 600 ms with a soft ease and out in 300 ms, so that the detail visibly arrives from the side and leaves faster than it came.
105. As a trader, I want Esc to close every sheet and shortcuts inside a sheet to work, so that sheets behave alike.
106. As a trader with reduced motion, I want every slide, spring, pulse and the orb replaced by its static state, so that the promise in the design holds.
107. As a trader, I want numbers in the mono font with tabular figures everywhere, so that columns align.
108. As a trader, I want money in sign colour only and process figures in the one process colour, so that the rule "money is shown, never rewarded" is visible.
109. As a trader on a phone, I want every page usable at 390 px with a 16 px gutter and no horizontal scroll, so that the redesign does not undo the mobile shell.
110. As a trader, I want a rule limit and the practice marker amber and calm, so that a warning never looks like a loss.
111. As a trader, I want every empty state to explain the rule that makes it empty, so that an empty page teaches rather than apologises.

## Implementation Decisions

### Branch, order and sources

- Everything lands on `feature/redesign` with a feature freeze on `main` until it merges,
  so `main` never mixes both designs. The branch starts from `main`; ADR 0004 and the
  glossary additions (process metric, money metric, process moment) are committed on it
  first.
- The prototypes are the primary source and are **rewritten, not copied**. The variant
  switcher, the `variant` and `view` search parameters, every `prototype/` directory and
  the prototype shell do not reach `main`. A ticket starts by reading the winning view on
  its prototype branch and the verdict in that branch's commit body.
- Documentation goes first: `context/Design.md` is archived as `context/Design-v1.md`
  and a short new `Design.md` is written from the verdicts (principles, tokens, the
  patterns below, motion, accessibility, anti-patterns). `AGENTS.md`,
  `context/project-overview.md` and `context/coding-standards.md` are updated where
  they encode the old language. Code comments citing "Design §…" point at v1 until the
  ticket touching that file updates them.
- Pages are rebuilt in this order, each its own ticket: shell and tokens, dashboard,
  journal (list, detail sheet, detail page), trade form (new and edit), progress,
  analytics, settings, prop firm rules, then the derived pages (ledger, econ calendar,
  strategies, import, weekly review, auth). A page is swapped whole; there is no
  per-page toggle between old and new.

### Stack and tokens

- shadcn/ui on Base UI replaces the hand-built primitives (button, badge, dialog,
  dropdown menu, input, textarea, tooltip, toggle, sheet, command palette, kbd,
  separator, progress). A hand-built primitive is deleted when its last use is
  replaced. Known traits of the generated code: the command dialog does not wrap its
  content in a command root, callers do; the input group needs two accessibility
  suppressions.
- `motion` stays the primary animation library and is used for: layout highlights that
  spring between options, press feedback, pop-in checks, step transitions, the shake,
  the drawn check, the pulse and the light sweep at process moments. Hover stays CSS.
  Tailwind v4 drives `translate` and `scale` through their own CSS properties, so a
  transition must name those properties, never `transform`.
- Three.js is used for the streak orb only, loaded lazily inside an effect, with a static
  SVG ring as the fallback before load, without WebGL and under reduced motion. The
  render loop stops after a moment. Nothing else uses Three.js; the badge constellation
  that tested it was rejected.
- GSAP enters the stack for the landing page and billing only. Nothing in this spec uses
  it; it is not installed by this spec.
- Fonts: Instrument Sans for text, IBM Plex Mono for every number, both already vendored.
- Tokens move from the prototype's scoped class to the global theme: the shadcn set
  (background, foreground, card, popover, primary, secondary, muted, accent, border,
  input, ring, destructive) plus three semantic tokens `positive`, `negative` and
  `process`, with the values set on the prototype branch. The old neon, glow, gradient
  and well tokens are removed with their last use. No hex and no rgba literal in a
  component; SVG colours come from a class, never a presentation attribute.
- The practice fog is a token: two inset shadows in the amber of the practice stripe,
  one wide and faint, one narrow and slightly stronger, over the whole content area and
  not over the sidebar. The values are the ones confirmed on the dashboard prototype.
- Overlays portal into `body`, so the theme class and the font classes are set on `body`,
  not on a wrapper.

### Patterns

**Shell.** A sidebar with three groups: Daily (Dashboard, Trade Journal, Econ
Calendar), Review (Analytics, Progress, Ledger), Set up (Strategies, Prop Firm Rules,
Settings). It collapses to a 56 px icon rail with tooltips; the toggle sits at the top
beside the account selector, the key `[` does the same, the state lives in
`localStorage`. A command palette on ⌘K lists pages, actions and accounts. "Log trade"
is the filled primary button, key `C`. Shortcuts ignore events whose target is an input,
textarea, select, editable element or dialog, and check that the target is an element
before calling `closest`. Below `lg` the existing top bar and drawer stay, restyled in
the new tokens; the practice fog applies to the content area there too.

**Overview (Dashboard).** The month calendar fills the main area; a day is tinted by
sign only; hover lifts the day with scale and shadow above its neighbours, reduced
motion keeps the shadow only. The right column holds the streak orb, the process
metrics, the plan card and the daily checklist. Below: money metrics as a mono key/value
list, the equity curve, recent entries. Ticking a checklist step strikes it through line
by line at a constant pen speed, with line boxes measured from the DOM; unticking
removes every line at once. SVG coordinates derived from trigonometry are rounded, or
server and client disagree in the last digit and hydration fails.

**Dense list and detail (Journal).** The day log: one section per trade date with a
sticky date column (weekday, date, entry count, missed count, day net P&L), a time strip
on the chart clock and entry cards with the first screenshot, notes excerpt, confluences
and mistakes. A card without a screenshot has no image field. Sorted by R the log is a
flat list. One "Filter" menu holds range, instrument (grouped by asset class) and sort;
the journal's search parameters are unchanged. A click opens a wide sheet with execution
and process side by side, accounts, confluences and mistakes right, then notes,
screenshots with lightbox and links with preview; "Open page" and "Edit" sit at the
top. The full detail page keeps its URL and shows the same content. The sheet reads the
row's data; it issues no second query.

**Dense table.** Where a list has no diary (Ledger, Econ Calendar, Strategies list),
it is the dense table from the journal's table view: a row per item, mono figures, a
detail sheet where there is a detail, keyboard navigation by row. A table's header
cells and figure cells do not wrap; the name cell may.

**Form (Trade form).** Five steps: What (taken or missed, instrument, date, direction,
accounts), Execution (times, prices, contracts, MFE and MAE, live P&L and R), Why
(session, setup type, entry model, strategy, confluences), Reflect (grade, felt, result,
by the book, mistakes, notes), Evidence (screenshots, links). Required fields live in
steps one and two; "Log now" from step three skips the rest; Enter moves on, ⌘↵ logs.
Choices are loose buttons: a shared highlight springs to the pick, the press gives, a
check pops in, a second click clears. Two-way answers are cards with a hint; the grade
is round buttons; many-of choices are chips that bounce and show a check; confluence
groups are each collapsible and open by default. The practice account is never
preselected and carries the amber stripe. The step rail echoes the answers so far and
checks a finished step. Steps slide in the direction of travel; the progress bar fills;
a blocked step shakes once and names what is missing. Saving draws a check and confirms
the action only, then offers "Log another" and "View in journal". ⌘V on the Evidence
step adds a pasted image; links must be https. Reduced motion keeps colours and drops
movement. Edit is the same steps prefilled. Ledger entry, weekly review and import use
the same blocks on one page, not in steps; import keeps its existing flow.

**Process metrics and moments (Progress).** Three columns: the orb with this week's
days (Monday to Friday) and the longest streak; the score ring of its four parts with a
legend and the logged trading days; the review card. Then "Next up" with the three
closest badges and their progress, the heatmap of 26 weeks (grace day dashed, today
outlined, each cell a trading day), the badge list by category with date or progress. A
process moment gathers the orb, pulses the newest logged day once and sweeps light over
the new badge row once; nothing moves at rest. The badge progress needs the counters the
badge sync already reads (entries logged, reviews written, by-the-book trades, longest
streak, best frozen monthly score); they are read in SQL, not derived in the component.

**Reading and charts (Analytics).** Six questions in order: what holds results up and
drags them down; when do I trade well; what am I trading and how; how do I execute; what
gets in my way; where do I hesitate. Every one of the eleven dimensions belongs to one
question. The first answer ranks buckets by avg R across all dimensions except account,
only where at least three trades had an R, showing R, its n and net P&L; the query hands
the per-bucket R count to the page. Weekday and hour are columns from a zero line placed
by the ratio of the largest gain to the largest loss. Dimensions inside a question are
small cards: top buckets, net P&L with avg R beside it, a thin bar under each row; the
bar scale excludes the "Not set" bucket, which shows its figures but no bar. A card, a
ranking row or a column chart opens a wide sheet with zero-line bars, the full table and
the metric switch; the overview has no switch. Execution shows winners against losers
with a legend; post-exit moves are called hypothetical. Missed setups show counts and
shares only. A table of contents of the questions follows the scroll with an
intersection observer. Column geometry (zero-line placement, bucket order for weekday
and hour) belongs in the domain module with tests, not in the component.

**Many sections, one entity (Settings).** One page with Accounts, Checklist, Data and
Security and a table of contents that follows the scroll; under Accounts the table of
contents lists every account with its practice stripe and rule dot. The accounts table
shows name, currency, starting balance, prop firm with rule dot and the practice stripe;
"Add account" and the archived accounts sit under it. A row opens the editor in a sheet
with details, commissions and prop firm link stacked; the sheet header shows "n / total"
with previous and next, and ↑/↓ do the same unless the focus is in a textarea or select.
The open account is the `account` search parameter (`new` for a new one), so the
dashboard's rule-status card links straight into the sheet; Esc clears it. The
checklist template is three columns with add on Enter and remove on hover; the existing
limits and reorder behaviour are unchanged. Export, username, password and two-factor
are rows with one action; the danger zone is set apart in the negative colour.

**Reference catalogue (Prop Firm Rules).** Size first: a size control (Any size plus
every known size), preselected to the size of a linked account or Any size. Below it one
card per program at that size with six key figures (size, target, max drawdown, daily
loss, min days, split) and tags; programs a real account is linked to come first and
carry the account's name. A card's clickable area is the firm name and figures; the
compare toggle is a sibling, because a button inside a button is invalid HTML and
breaks hydration. The card opens the firm in a sheet: website, verified date, the
firm's program switcher in the head, key figures, tags, all 18 rules in one column. Up to
three programs go into an inline compare panel above the cards, verbatim, no column
sorted, no winner marked, a dot on rows whose wording differs. A missing rule reads "Not
recorded". Search, size, tag chips and the compare selection stay in the URL as today;
the rows are filtered in the query as today. Key figures are shown as the file writes
them, truncated with the full text on hover; nothing parses them.

**Sheet.** One sheet component for every detail and editor: wide (journal detail,
analytics detail), medium (editors, firm page). It slides fully in from the
right over 600 ms with a soft ease-out and out over 300 ms with ease-in, replacing the
primitive's short nudge and fade; under reduced motion it appears without movement. Esc
closes it; keyboard handling inside a sheet is bound on the sheet, because the dialog
does not propagate key events to the window. A sheet that shows an entity the app can
link to (an account) holds it in the URL; the journal detail does not, because the trade
has its own page.

**Feedback.** Feedback confirms the action, never the outcome: "Trade logged",
"Account saved", "Imported 12 trades". A saved state holds briefly on the button, then
returns. Interaction feedback appears within 100 ms and takes 150 ms: colour, a 1 px
lift, a 2 px arrow nudge, a press that gives. Expressive animation is reserved for
process moments and stays proportional. No animation shifts layout. Money is shown in
sign colour and nothing else; the process colour marks process figures.

**Mobile.** Every page is checked at 390 px: the sidebar's table of contents and
secondary columns hide below `lg`, grids collapse to one column, sheets take the full
width, tables scroll horizontally inside their container, the 16 px gutter holds and
nothing scrolls sideways. The mobile shell's behaviour is unchanged.

### Data and queries

- No schema change and no migration.
- New reads, all aggregated in SQL and scoped like the queries beside them: the per-bucket
  count of trades with an R for every analytics dimension; the badge counters, the best
  frozen monthly score and the recently reviewed weeks for Progress; the user's account
  links with account names for Prop Firm Rules. The journal detail sheet reads the list
  row and issues no second query.
- Process figures keep ignoring the account selector: streak, score and badges see real
  accounts only. Money keeps the display currency of the selected scope.

### Lessons the prototypes recorded

- Rounding SVG coordinates from trigonometry avoids hydration mismatches.
- A key handler must check `event.target instanceof Element` before `closest`; the
  target can be `window`.
- Base UI's dialog keeps key events from reaching `window`.
- A card with its own actions is not itself a button.
- A transition on a lift or press must name `translate` and `scale`.
- Loading a page right after a save can hydrate new client code against old server
  markup in development; reload before concluding a mismatch is real.

## Testing Decisions

- A good test checks behaviour the trader sees or a rule the product states, never the
  shape of a component. The redesign is presentation, so the highest seam is the browser.
- **Browser click path per page**, at desktop width and at 390 px, as the mobile-shell
  spec did: the page's own flows (open, filter, open detail, close with Esc, save with
  the stub-free real action, keyboard shortcuts), reduced motion emulated once per page,
  console free of new errors on every step, no hydration warning on a clean load. The
  ticket's acceptance states the click path.
- **Domain and lib tests with Vitest** for every rule the redesign moves into
  `src/domain/**` or `src/lib/**`: the heatmap's trading weeks, the score ring's arc
  shares, the zero-line placement and bucket order of the column charts, the ranking
  threshold of three R trades, the `account` and prop-firm URL state. Prior art:
  `src/domain/__tests__`, `src/lib/journal/__tests__`, `src/lib/prop-firms/__tests__`.
- **Query tests** against Postgres for the new reads, beside the existing ones in
  `src/db/queries/__tests__`; a skipped query test is not verification.
- **One static guard test**, in the style of the toast import guard and the
  reduced-motion guard: no hex or rgba literal in a component, no `prototype/` directory
  and no `variant` or `view` parameter left, the motion config at the root, the theme
  class on `body`. It fails the build the moment a prototype artefact or a raw colour
  comes back.
- No component tests and no E2E script are introduced.
- The full gate from `context/ai-interaction.md` runs before every commit: lint,
  typecheck, test, build, then the browser.

## Out of Scope

- Light mode, a theme toggle or any token for it.
- The landing page and billing, and with them any use of GSAP.
- Structured numeric rule fields in `PropFirmsData.md` (target, drawdown, daily loss as
  numbers) so a view could sort or filter by them. That is a data model decision taken
  separately; until then no view parses a rule.
- Three.js beyond the streak orb.
- New product behaviour: no new metrics, badges, filters, fields, sharing or ranking;
  the trade form logs the same fields as today.
- Component tests, E2E, visual regression tooling.
- Mobile gestures, bottom navigation, PWA.
- Deleting the `prototype/*` branches; they stay as the primary source until the merge,
  and are deleted only after asking.

## Further Notes

- Prototype branches, each on top of the previous, so the last holds all seven:
  `prototype/redesign-dashboard` (a4f742b, navigation and dashboard),
  `prototype/redesign-journal` (f690eea), `prototype/redesign-trade-form` (2d81a53),
  `prototype/redesign-progress` (9eb64d1), `prototype/redesign-analytics` (a03d2e9),
  `prototype/redesign-settings` (8ef7701), `prototype/redesign-prop-firms` (7710d2d).
  The verdict of each round is in its commit body; the handoff collects them.
- Winning views: shell and dashboard D (`?variant=D`), journal D, trade form E,
  progress D, analytics D, settings D, prop firms D, each on its page with `?view=`.
- The prototypes are desktop-first; nothing was checked at phone width. The mobile
  behaviour above is a decision of this spec, not a verdict.
- The practice fog's values and the sheet timing were confirmed by the user on the
  prototype and are recorded in the commit bodies.
- ADR 0004 gains two notes when it is committed: GSAP is reserved for the landing page
  and billing, and the prototype branches are the primary source for this spec.
- `vitest.setup.ts` reads `.env.local`; Postgres must run for the query tests, the
  commit hook and `pnpm dev`.
