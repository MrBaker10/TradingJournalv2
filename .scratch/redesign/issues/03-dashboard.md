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

**Status:** ready-for-agent

- [ ] Month calendar is the main area; a day with net P&L is tinted by sign only; a day with none is untinted; a big day and a small day of the same sign look the same.
- [ ] Hover lifts a day above its neighbours; with reduced motion emulated only the shadow appears; the transition names `translate` and `scale`, never `transform`.
- [ ] Right column: orb with the current streak, process metrics in the process colour, plan card, daily checklist; practice data is excluded from every figure as today.
- [ ] Money metrics as a mono key/value list in sign colour, no glow; equity curve and recent entries below; the display currency follows the selected scope as today.
- [ ] Ticking a step draws the strike line by line at constant speed; a step that wraps gets one line per text line; unticking clears all lines at once; the checklist's existing limits and server actions are unchanged.
- [ ] Orb renders through Three.js after load, shows the SVG ring before load, without WebGL and under reduced motion; the render loop stops after the moment; nothing on the page moves at rest.
- [ ] A clean load produces no hydration warning (rounded SVG coordinates).
- [ ] Old dashboard components without a remaining use are removed; old tokens they used alone go with them.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, hover a day, tick and untick a step, switch to a practice account and back, navigate to a recent entry; reduced motion emulated once; no new console errors.

## Do not build

- New metrics, new checklist behaviour or any product change.
- Three.js anywhere else; the Progress page reuses this orb in ticket 07.
- The journal, the trade form or any other page.
