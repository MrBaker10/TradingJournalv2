# 03: Dashboard

**What to build:** The dashboard reads from month to detail. The month calendar fills
the main area; each day is tinted green or red by the sign of its net P&L only, never
by its size; hover lifts a day with scale and shadow above its neighbours, reduced
motion keeps the shadow only. The right column holds the streak orb, the process
metrics, the pre-market plan card and the daily checklist. Below the calendar the money
metrics are a mono key/value list that glows nowhere, then the equity curve and the
recent entries. Ticking a checklist step strikes it through line by line at a constant
pen speed with line boxes measured from the DOM; unticking removes every line at once.
When a process moment occurs the orb gathers its points and turns once, then rests.

The orb is the only use of Three.js: loaded lazily inside an effect, a static SVG ring
as the fallback before load, without WebGL and under reduced motion, and the render loop
stops after a moment. This ticket installs Three.js with the version the prototype
branch pinned. SVG coordinates derived from trigonometry are rounded so server and
client agree.

Spec: `.scratch/redesign/spec.md` → Dashboard, Overview pattern. Design:
`context/Design.md`. Source: the winning view on `prototype/redesign-dashboard` and the
verdict in its commit body; rewrite, do not copy.

**Blocked by:** 02 (Shell and tokens)

**Status:** done

- [x] Month calendar is the main area; a day with net P&L is tinted by sign only; a day with none is untinted; a big day and a small day of the same sign look the same.
- [x] Hover lifts a day above its neighbours; with reduced motion emulated only the shadow appears; the transition names `translate` and `scale`, never `transform`.
- [x] Right column: orb with the current streak, process metrics in the process colour, plan card, daily checklist; practice data is excluded from every figure as today.
- [x] Money metrics as a mono key/value list in sign colour, no glow; equity curve and recent entries below; the display currency follows the selected scope as today.
- [x] Ticking a step draws the strike line by line at constant speed; a step that wraps gets one line per text line; unticking clears all lines at once; the checklist's existing limits and server actions are unchanged.
- [x] Orb renders through Three.js after load, shows the SVG ring before load, without WebGL and under reduced motion; the render loop stops after the moment; nothing on the page moves at rest.
- [x] A clean load produces no hydration warning (rounded SVG coordinates).
- [x] Old dashboard components without a remaining use are removed; old tokens they used alone go with them.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, hover a day, tick and untick a step, switch to a practice account and back, navigate to a recent entry; reduced motion emulated once; no new console errors.

## Do not build

- New metrics, new checklist behaviour or any product change.
- Three.js anywhere else; the Progress page reuses this orb in ticket 07.
- The journal, the trade form or any other page.

## Review

Gates on the final tree: `pnpm lint`, `pnpm typecheck`, `pnpm test` (83 files, 1355
tests, none skipped) and `pnpm build` pass. Browser click path with Playwright against
the demo user (`pnpm db:seed:demo`) at 1440 px and 390 px, plus once with reduced
motion: 43 checks pass, no console error and no hydration warning. Headless Chromium
logs "GPU stall due to ReadPixels" for any WebGL canvas (reproduced with a bare WebGL
canvas outside the app); `motion` logs its reduced-motion notice.

- Agreed before implementation: the calendar starts on Monday as on the prototype;
  metric labels stay readable ("Net P&L"), no money metric is dropped; the plan card
  stays editable with the end-of-day review; days without entries are no links and
  do not lift.
- `three` 0.186.1 and `@types/three` 0.186.0 as pinned on `a4f742b`; version table in
  `coding-standards.md` updated. three.js is imported inside the orb's effect; it
  draws the points once and stops, at a process moment (`bumpStreak` or a due
  milestone) after gathering and one turn. The ring outline stays SVG throughout.
- Pure rules with tests in `src/lib/dashboard/`: Monday-first month grid, rounded
  ring coordinates, pen-strike line timing; `formatCentsCompact` in `src/lib/money.ts`
  prints a signed amount on a phone's calendar day so colour is never the only sign.
- Fixed from review: no inline style on the orb; the day lift no longer transitions
  `border-radius`; 40 px touch targets for month paging and the review toggle; the
  review disclosure animates `max-height`; taken R in sign colour; one sign → colour
  map (`src/lib/dashboard/sign-tone.ts`) and one key/value row; milestone wording,
  "all time" context and the empty-month score as before; strike lines measured
  again after the web fonts load.
- Removed with their last use: `pnl-calendar`, `metric-panel`, `progress-tiles`,
  `streak-bump`, `milestone-card`, `MetricCell`'s `highlight` prop, and the tokens
  `--color-success-hi`, `--color-danger-hi`, `--gradient-day-*`, `--shadow-day-*`,
  `--gradient-today`, `--color-chart-*`. `MetricCell` stays for Ledger and Progress.
- Open, for later tickets: by the book, the taken count and missed setups sit in the
  process column but follow the account selector, as they did on the old dashboard;
  the shared caption style (`text-[11px] … uppercase`) repeats across dashboard
  components and could become one class with ticket 15; `MonthCalendar` and the
  orb's effect are long.
