# 07: Progress

**What to build:** Progress gives the streak, the score and the badges a body. Three
columns at the top: the streak orb with this week's days (Monday to Friday) and the
longest streak; the consistency score as a ring of its four parts with a legend and the
logged trading days; a card for this week's review with "Write review" that lifts on
hover with its arrow moving. Then "Next up" with the three badges closest to being
earned and their progress, a heatmap of logged trading days over 26 weeks with the grace
day dashed and today outlined, and the badges as a list by category with the date earned
or the progress. Nothing moves at rest. A process moment gathers the orb, pulses the
newest logged day once and sweeps light over the new badge row once. The badge progress
needs the counters the badge sync already reads (entries logged, reviews written,
by-the-book trades, longest streak, best frozen monthly score) and the recently reviewed
weeks; they are read in SQL beside the existing queries, scoped like them, and see real
accounts only as today.

Spec: `.scratch/redesign/spec.md` → Progress, Process metrics and moments pattern.
Design: `context/Design.md`. Source: the winning view on `prototype/redesign-progress`
and the verdict in its commit body; rewrite, do not copy.

**Blocked by:** 03 (Dashboard, for the orb)

**Status:** ready-for-agent

- [ ] Orb column shows the current streak, this week's weekdays marked by logged or not, and the longest streak; the orb is the dashboard's component, lazy with the SVG fallback.
- [ ] Score ring shows the four parts of the consistency score with a legend and the logged trading days; the arc shares are computed in the domain module with Vitest tests and rounded for hydration.
- [ ] Review card shows this week's state and "Write review"; hover lifts it 1 px and nudges the arrow; with reduced motion the colour changes only.
- [ ] "Next up" lists the three unearned badges closest to their threshold with progress; the counters come from the new query, not from the component; a query test against Postgres covers the counters, the best frozen monthly score and the reviewed weeks, with ownership and the real-accounts-only rule.
- [ ] Heatmap covers 26 trading weeks ending today; the grace day is dashed, today outlined, each cell a trading day; the week layout is a domain function with tests.
- [ ] Badge list is grouped by category and shows the date earned or the progress; no trophy case, no glow.
- [ ] After a save that earns a badge or extends the streak, the orb gathers, the newest day pulses once and the new badge row sweeps once; with reduced motion emulated the states change without movement; nothing moves at rest.
- [ ] Practice accounts stay excluded from streak, score and badges regardless of the account selector.
- [ ] Old progress components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, hover the review card, open "Write review", trigger a process moment through a real save, return; reduced motion emulated once; no new console errors.

## Do not build

- New badges, metrics or score rules.
- The weekly review form; ticket 13.
- Three.js beyond the orb; the badge constellation was rejected.
