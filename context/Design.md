# Design.md — Trading-Journal

Design v2: how the app behind the login looks and behaves. Written from the seven
prototype verdicts of 2026-10-26/27 (ADR 0004, spec `.scratch/redesign/spec.md`). What
the app does lives in `project-overview.md`; how code is written lives in
`coding-standards.md`. Terms (process metric, money metric, process moment, practice
account): `GLOSSARY.md`.

The previous document is archived whole as `Design-v1.md`. A "Design §…" reference in a
code comment, in `decisions.md`, `history.md`, the dated Decisions of
`project-overview.md` or a ticket before the redesign points at v1 until the ticket that
touches that file updates it.

**Source for detail.** This document states the shape, states and motion of every
pattern. For pixel detail a page ticket may look at the winning view on its
`prototype/redesign-*` branch (listed in `.scratch/redesign/spec.md` → Further Notes);
it rewrites, never copies. A difference between this document and the branch is
reported, not silently resolved.

---

## 1. Principles

1. **Calm at rest, responsive on touch.** Modelled on the Stripe dashboard. Nothing
   moves without a trigger; everything the pointer or keyboard touches answers within
   100 ms.
2. **Money is shown, never rewarded.** Money metrics carry their sign colour and
   nothing else. A green day and a red day get the same weight and the same feedback.
3. **Process is the one accent.** Process metrics (streak, consistency score, badges,
   by-the-book, reviews) use the `process` colour. Expressive animation happens only at a
   process moment and stays proportional to it.
4. **Feedback confirms the action, never the outcome.** "Trade logged", not
   "+$800.00, +2.00R".
5. **One way to open detail.** A detail opens in a sheet over the list, a full page
   exists where the entity has its own URL, and nothing expands inline inside a list.
6. **Dark only.** No light mode, no theme toggle, no token for either.
7. **Practice is always visible.** A selected practice account fogs the content area;
   a practice account anywhere in a list carries the amber stripe.
8. **Empty states teach.** An empty state names the rule that makes it empty and the
   next action, without apology.

---

## 2. Tokens

Defined once in `src/app/globals.css` on the global theme, with the values set on
`prototype/redesign-prop-firms` in `src/app/globals.css` (the block scoped to
`.redesign`). The shell-and-tokens ticket (`.scratch/redesign/issues/02-*`) moves them
out of that scope; this document names roles, not values. No hex and no `rgba()` literal in a component; SVG colours come
from a class, never a presentation attribute.

### Surfaces and text (shadcn set)

| Token | Role |
|---|---|
| `background` / `foreground` | Page surface and body text |
| `card` / `card-foreground` | Raised surface: entry cards, catalogue cards, the review card, auth card |
| `popover` / `popover-foreground` | Menus, the command palette, sheets, tooltips, toasts |
| `primary` / `primary-foreground` | The one filled button per view ("Log trade", "Save") |
| `secondary` / `secondary-foreground` | Secondary buttons |
| `muted` / `muted-foreground` | Quiet fills (selected option, table header) and secondary text |
| `accent` / `accent-foreground` | Hover and highlighted rows, menu items |
| `border` | Hairlines between rows and around surfaces |
| `input` | Field borders and the outline of an unselected choice |
| `ring` | Focus ring |
| `destructive` | Destructive buttons |
| `sidebar-*` | The shell sidebar's own surface, text, accent, border and ring |
| `radius` | Base corner radius; shadcn derives the steps |

### Semantic

| Token | Role |
|---|---|
| `positive` | Money with a positive sign: P&L, R, day tint, equity above zero |
| `negative` | Money with a negative sign; a validation message |
| `process` | Process metrics, selected process chips, the drawn save check, the orb, heatmap cells, process moments |
| practice amber | The practice stripe and the practice fog: Tailwind `amber-400` as on the prototype |
| `impact-low` / `impact-medium` / `impact-high` | The econ calendar's impact folder only. Its red is not `negative` and its orange not the practice amber |
| `practice-fog` (shadow) | Two inset shadows in the practice amber over the content area: one wide and faint, one narrow and slightly stronger (values confirmed on the dashboard prototype, recorded in `handoffs/HANDOFF-2026-10-26-redesign-prototype.md`) |

Amber also marks a rule limit that is close ("calm warning"). A breached rule uses
`negative`. Amber never stands for a loss.

### Type

- Instrument Sans for text, IBM Plex Mono for every number, with tabular figures, both
  vendored in `src/app/fonts/`. Theme and font classes on `body`: `coding-standards.md`
  → Styling.

---

## 3. Patterns

Each pattern names its **shape**, its **states**, its **motion** and the
**reduced-motion** fallback. Pages without a prototype are built from these
(spec → Implementation Decisions).

### 3.1 Shell

- **Shape.** Sidebar with three groups: Daily (Dashboard, Trade Journal, Econ
  Calendar), Review (Analytics, Progress, Ledger), Set up (Strategies, Prop Firm Rules,
  Settings). Account selector and collapse toggle at the top. "Log trade" is the one
  filled primary button. Collapses to a 56 px icon rail with tooltips.
- **States.** Item: rest, hover (`accent`), active (`sidebar-accent`), focus ring.
  Expanded or collapsed, remembered in `localStorage`. Practice selected: fog over the
  content area, sidebar excluded; the account in the selector carries the amber marker.
- **Keys.** `[` toggles the sidebar, `C` opens the trade form, ⌘K opens the command
  palette (pages, actions, account switch). Shortcuts ignore events whose target is an
  input, textarea, select, editable element or dialog, and check
  `event.target instanceof Element` before `closest`.
- **Motion.** Width transition 200 ms ease-out; the fog follows the content edge with
  it. Items press with a slight scale.
- **Reduced motion.** Width and fog change without transition.
- **Below `lg`.** The existing top bar and drawer stay, restyled in these tokens; the
  fog covers the content area there too.

### 3.2 Overview (Dashboard)

- **Shape.** The month calendar fills the main area. Right column: streak orb, process
  metrics, pre-market plan card, daily checklist. Below the calendar: money metrics as
  a mono key/value list, the equity curve, recent entries.
- **Calendar day.** Tinted `positive` or `negative` by the sign of the day's net P&L,
  never by its size; days outside the month are faded and inert. Each day has an
  `aria-label` with date, amount and entry count.
- **States.** Hover lifts the day above its neighbours: card surface, small upward
  translate, scale about 1.04, shadow, rounded corners; press settles to about 1.01.
- **Checklist.** Ticking strikes the step through like a pen, line by line, at a
  constant pen speed (900 px/s on the prototype), line boxes measured from the DOM.
  Unticking removes all lines at once.
- **Equity curve.** Sign colour above and below zero, the area fading from faint to
  nothing; no glow.
- **Orb.** Three.js, loaded lazily inside an effect; a static SVG ring before load,
  without WebGL and under reduced motion. At a process moment the points gather and
  the ring turns once, then the render loop stops.
- **Motion.** Day hover 150 ms ease-out. SVG coordinates from trigonometry are rounded
  so server and client agree.
- **Reduced motion.** Day hover keeps the shadow only. Strike lines appear at once.
  The orb is the static ring.

### 3.3 Dense list and detail (Journal)

- **Shape: day log.** One section per trade date. A sticky date column shows weekday,
  date, entry count, missed count and the day's net P&L. A time strip places the day's
  entries on the chart clock: dots in sign colour, missed setups grey. Entry cards show
  the first screenshot, a notes excerpt, confluences and mistakes. A card without a
  screenshot has no image field. Missed setups use the same card, marked.
- **Sorted by R** the log is a flat list without day sections.
- **Filter.** One "Filter" menu: range, instrument (grouped by asset class), sort. The
  journal's search parameters are unchanged. A filtered range shows counts, never a
  money total.
- **Detail sheet** (wide). "Open page" and "Edit" at the top. Execution and process
  side by side; accounts, confluences and mistakes to the right; then notes,
  screenshots with lightbox, links. The sheet reads the row's data and issues no second
  query. It is not in the URL, because the trade has its own page.
- **Detail page** at `/journal/[id]`: the same content as the sheet.
- **Links and screenshots.** Links are anchors (`target="_blank"`,
  `rel="noopener noreferrer"`). A TradingView snapshot link may show a preview image
  derived by the pure string rule `snapshotImageUrl` in `src/lib/links.ts` and loaded by
  the browser; if it fails, the link falls back to text. Nothing fetches a link
  server-side, nothing embeds it. With neither screenshots nor links the section is
  absent.
- **States.** Card: rest, hover (`accent` border or surface, 1 px lift), focus ring.
- **Motion and reduced motion.** As every card (§4) and every sheet (§3.10).

### 3.4 Dense table (Ledger, Econ Calendar, Strategies list)

- **Shape.** A row per item, mono figures right-aligned, a detail sheet where there is
  a detail. Header cells and figure cells do not wrap; the name cell may.
- **States.** Row: rest, hover (`accent`), focus, selected (sheet open). Keyboard
  navigation by row.
- **Motion.** Colour only, 150 ms. **Reduced motion.** Unchanged (colour is not motion).
- **Below `lg`.** The table scrolls horizontally inside its container.

### 3.5 Form (Trade form)

- **Shape.** Five steps: What, Execution, Why, Reflect, Evidence. Required fields only
  in steps one and two, marked in the rail. "Log now" from step three on. Enter moves
  on, ⌘↵ logs. A step rail on the side echoes the answers so far under each step and
  checks a finished step; a progress bar fills with the steps.
- **Blocks.**
  - Loose choice buttons, not a segmented bar. A second click on the chosen option
    clears it.
  - Two-way answers (taken or missed, long or short) are two large cards with a hint.
  - Grade A–F as round buttons.
  - Many-of choices (accounts, confluences, mistakes) as chips with a check; confluence
    groups are each collapsible and open by default.
  - The practice account is never preselected and carries the amber stripe.
  - Live P&L and R only while typing, in sign colour.
  - ⌘V on the Evidence step adds a pasted screenshot; links must be https.
- **States.** Choice: rest (`input` outline), hover, selected (shared `muted`
  highlight, check), focus ring, disabled. Process chips select in `process`.
  Missing required fields: named in one line ("Still needed: …") in `negative`.
- **Motion.** The shared highlight springs to the pick (`layoutId`, stiffness 520,
  damping 34); the pressed button gives (`whileTap`, scale about 0.92 on chips); the
  check pops in; a toggled chip bounces once (scale 1 → 1.06 → 1, 220 ms). Steps slide
  28 px in the direction of travel with a fade (200 ms ease-out). A blocked step shakes
  its message once (350 ms). Saving draws a circle and a check in `process` (450 ms,
  then 300 ms), then "Trade logged" or "Missed setup logged" with "Log another" and
  "View in journal".
- **Reduced motion.** Colours and checks only: no spring, slide, bounce, shake or
  drawing; the saved state appears at once.
- **Edit** is the same steps with every answer prefilled. Ledger entry, weekly review
  and import use the same blocks on one page, not in steps; import keeps its flow.

### 3.6 Process metrics and moments (Progress)

- **Shape.** Three columns on top: the orb with this week's days (Monday to Friday)
  and the longest streak; the score ring of its four parts with a legend and the logged
  trading days; the card for this week's review with "Write review". Then "Next up":
  the three badges closest to being earned with their progress ("132/250"). Then the
  heatmap of 26 weeks, each cell a trading day, grace day dashed, today outlined. Then
  the badge list by category with the date earned or the progress.
- **States.** Heatmap cell: logged (`process`), not logged, grace day (dashed), today
  (outline). Badge row: earned (date) or in progress (bar). "Write review": hover
  lifts 1 px with a soft `process` shadow and the arrow nudges 2 px, press scales to
  about 0.97.
- **Process moment.** The orb gathers and turns once; the newest logged day in the
  heatmap pulses once (scale and a brief `process` light, 900 ms); a band of light
  sweeps over the new badge row once (1.1 s). Then everything rests.
- **At rest** nothing on the page moves.
- **Reduced motion.** Static ring, no pulse, no sweep; the new state is simply there.

### 3.7 Reading and charts (Analytics)

- **Shape.** Six questions in order: what holds my results up and what drags them
  down; when do I trade well; what am I trading and how; how do I execute; what gets in
  my way; where do I hesitate. Every dimension belongs to one question. A table of
  contents of the questions follows the scroll.
- **Ranking** ("holding up / dragging"): ranked by avg R across every dimension except
  account, only buckets with at least three trades with an R; each row shows R, its n
  and net P&L.
- **Weekday and hour** are columns from a zero line placed by the ratio of the largest
  gain to the largest loss.
- **Small multiples.** Dimensions inside a question are small cards side by side: top
  buckets, net P&L with avg R beside it, a thin bar under each row. "Not set" shows its
  figures but no bar and is excluded from the bar scale.
- **Detail sheet** (wide) from a card, a ranking row or a column chart: zero-line bars,
  the full table and the metric switch. The overview has no metric switch.
- **Execution** shows winners against losers with a legend; post-exit moves are called
  hypothetical. **Missed setups** show counts and shares only, never P&L.
- **States.** Card and ranking row: rest, hover (`accent`, 1 px lift), focus. Table of
  contents: current question highlighted.
- **Motion.** Hover 150 ms; the sheet as §3.10. Charts do not animate at rest.
- **Reduced motion.** Recharts animation off (`isAnimationActive` from
  `useReducedMotion()`).

### 3.8 Many sections, one entity (Settings)

- **Shape.** One page: Accounts, Checklist, Data, Security, with a table of contents
  that follows the scroll and lists every account under Accounts with its stripe and
  rule dot. Accounts as a dense table: name, currency, starting balance, prop firm with
  rule dot, practice stripe; "Add account" and archived accounts under it. The
  checklist template in three columns, add on Enter, remove on hover; reorder and
  limits as before. Export, username, password and two-factor as rows with one action;
  the danger zone set apart with a `negative` border and a `negative` action.
- **Editor sheet** (medium): details, commissions, prop firm link stacked. Header shows
  "n / total" with previous and next; ↑/↓ do the same unless focus is in a textarea or
  select. The open account is the `account` search parameter (`new` for a new one);
  Esc closes the sheet and clears it.
- **States.** Row: rest, hover, focus, open. Rule dot: ok, close (amber), breached
  (`negative`), not checkable (muted).
- **Motion and reduced motion.** As §3.4 and §3.10.

### 3.9 Reference catalogue (Prop Firm Rules)

- **Shape.** Size first: a size control (Any size plus every known size), preselected
  to a linked account's size, else Any size. One card per program at that size with six
  key figures (size, target, max drawdown, daily loss, min days, split) and tags.
  Programs a real account is linked to come first and carry the account's name. Key
  figures as written in the data, truncated with the full text on hover; nothing parses
  them. Search, size, tags and the compare selection live in the URL.
- **Card.** The clickable area is the firm name and figures; the compare toggle is a
  sibling, never inside it.
- **Firm sheet** (medium): website, verified date, the firm's program switcher in the
  head, key figures, tags, all 18 rules in one column. A missing rule reads "Not
  recorded".
- **Compare.** Up to three programs in an inline panel above the cards, verbatim, no
  column sorted, no winner marked, a dot on rows whose wording differs.
- **States.** Card: rest, hover (lift, border), focus; compare toggle: off, on, full
  (disabled at three).
- **Motion and reduced motion.** As every card (§4) and every sheet (§3.10).

### 3.10 Sheet

- **Shape.** One sheet component for every detail and editor, from the right.
  Wide (`max-w-5xl` for the journal detail, `max-w-3xl` for the analytics
  detail) or medium (`max-w-2xl` for editors and the firm page); full width below `lg` (§3.12).
- **Behaviour.** Esc closes. Keyboard handling inside a sheet is bound on the sheet,
  because the dialog does not pass key events to `window`. A sheet for an entity the
  app can link to holds it in the URL. The journal detail is not in the URL, because
  the trade has its own page (§3.3).
- **Motion.** Slides fully in from the right over 600 ms, `cubic-bezier(0.32, 0.72, 0,
  1)`; out over 300 ms ease-in. No fade and no short nudge.
- **Reduced motion.** Appears and disappears without movement.

### 3.11 Feedback

- **Wording.** The action, never the outcome: "Trade logged", "Account saved",
  "Imported 12 trades", "Entry deleted".
- **Button.** Pending disables the button and says "Saving…"; the saved state shows a
  check and "Saved" for about 1.5 s, then returns to rest (as on the settings
  prototype). The trade form's drawn check is §3.5.
- **Errors.** Field errors inline beside the field; a failed save as a toast that keeps
  the input ("Couldn't save. Your text is still here — try again."). Toasts sit in an
  `aria-live="polite"` region.
- **Money.** Sign colour only. Process figures in `process`.
- **Motion.** Colour and text change in 150 ms; toasts enter and leave without
  shifting layout. **Reduced motion.** The same states without transition.

### 3.12 Mobile

- Every page works at 390 px with a 16 px gutter and no horizontal page scroll.
- Below `lg`: tables of contents and secondary columns hide, grids collapse to one
  column, sheets take the full width, tables scroll inside their container.
- The mobile shell (top bar, drawer) behaves as before, in the new tokens.
- **Motion.** The drawer keeps its existing motion; a sheet slides as in §3.10 at full
  width. **Reduced motion.** As on desktop.

### 3.13 Pages built from the patterns

- **Ledger, Econ Calendar, Strategies list:** dense table (§3.4), detail sheet where
  there is a detail.
- **Ledger entry, weekly review, import:** the form blocks of §3.5 on one page.
  The weekly review's summary sits beside the form as a mono key/value list like the
  dashboard's money metrics, with net P&L as a neutral figure.
- **Trade edit:** §3.5 prefilled. **Trade detail page:** §3.3.
- **Login and Register:** a calm single `card` in the same tokens, centred, one primary
  button. Errors and feedback as §3.11.

---

## 4. Motion

**Library split** (which library does what, and the Tailwind `translate`/`scale`
transition rule): `coding-standards.md` → Motion. Hover and focus are CSS.

| Moment | Budget |
|---|---|
| Interaction feedback (hover, press, colour, border) | starts within 100 ms, takes 150 ms |
| Card, row and button hover | colour or border, 1 px lift; arrow nudge 2 px |
| Calendar day hover | 2 px lift with scale about 1.04 (§3.2) |
| Sheet | 600 ms in, eased out; 300 ms out, eased in |
| Sidebar collapse | 200 ms ease-out |
| Step slide | 200 ms ease-out |
| Expressive animation | only at a process moment, proportional to it |

Rules:

- No animation without a trigger, none that blocks input, none that shifts layout.
- `<MotionConfig reducedMotion="user">` at the root, the reduced-motion CSS block in
  `globals.css`, and `useReducedMotion()` for Recharts and the orb. Under reduced
  motion every slide, spring, bounce, shake, pulse, sweep and the orb become their
  static end state; colours and checks remain.
- Heavy libraries (Three.js) load lazily on the page that needs them.
- A page with a table of contents that follows the scroll gives its last section at
  least the height of the screen, so every entry can scroll to the top.

---

## 5. Accessibility

- Focus ring visible on everything focusable (`ring` token); never `outline: none`
  without a replacement.
- Interactive targets at least 40 px high on touch layouts.
- Colour is never the only carrier: the sign on amount and R, "missed" as text, the
  practice account named as well as striped, the rule dot with a label.
- Calendar days and heatmap cells carry an `aria-label` with their date and values.
- Choices expose their state (`aria-pressed`, `aria-checked`, radio groups); the step
  rail marks the current step (`aria-current`).
- Sheets and the command palette are Base UI dialogs: focus moves in and returns on
  close.
- Secondary text (`muted-foreground`) is for secondary information, never for a value
  or a control.

---

## 6. Anti-patterns

Gone with v1:

- Glow at rest, neon edges, glowing numbers.
- Gradient tiles, gradient fills and gradient borders on surfaces (cards, buttons,
  tiles, text). Two exceptions, both from the prototypes: the equity curve's area fades
  from a faint sign colour to nothing, and the light sweep of a process moment.
- A card around everything; a card inside a card; disclosures inside disclosures.
- Hand-built primitives where shadcn/ui on Base UI has one.
- Feedback that repeats the result ("+$800.00, +2.00R" on save).
- Any reward, highlight or celebration for money: no winner marked in a comparison, no
  emphasis on a big day, no animation on a green day.

Also not allowed:

- A detail that expands inline inside a list.
- A button inside a button (a card with its own actions is not itself a button).
- Animation without a trigger, or one that slows input.
- An empty image field, an empty section or a placeholder for missing data.
- A hex or `rgba()` literal in a component; a colour set through an SVG presentation
  attribute.
