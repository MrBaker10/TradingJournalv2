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

**Status:** done

- [x] Orb column shows the current streak, this week's weekdays marked by logged or not, and the longest streak; the orb is the dashboard's component, lazy with the SVG fallback.
- [x] Score ring shows the four parts of the consistency score with a legend and the logged trading days; the arc shares are computed in the domain module with Vitest tests and rounded for hydration.
- [x] Review card shows this week's state and "Write review"; hover lifts it 1 px and nudges the arrow; with reduced motion the colour changes only.
- [x] "Next up" lists the three unearned badges closest to their threshold with progress; the counters come from the new query, not from the component; a query test against Postgres covers the counters, the best frozen monthly score and the reviewed weeks, with ownership and the real-accounts-only rule.
- [x] Heatmap covers 26 trading weeks ending today; the grace day is dashed, today outlined, each cell a trading day; the week layout is a domain function with tests.
- [x] Badge list is grouped by category and shows the date earned or the progress; no trophy case, no glow.
- [x] After a save that earns a badge or extends the streak, the orb gathers, the newest day pulses once and the new badge row sweeps once; with reduced motion emulated the states change without movement; nothing moves at rest.
- [x] Practice accounts stay excluded from streak, score and badges regardless of the account selector.
- [x] Old progress components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, hover the review card, open "Write review", trigger a process moment through a real save, return; reduced motion emulated once; no new console errors.

## Do not build

- New badges, metrics or score rules.
- The weekly review form; ticket 13.
- Three.js beyond the orb; the badge constellation was rejected.

## Review

Gates on the final tree: `pnpm lint`, `pnpm typecheck`, `pnpm test` (87 files, 1383
tests, none skipped) and `pnpm build` pass. Browser click path with Playwright against
the demo user at 1440 px and 390 px, plus once with reduced motion: 48 checks pass
(three columns, hover lift 1 px and arrow 2 px, "Write review" and back, practice
selected leaves streak, score and badges unchanged, a missed setup logged through the
form plays the moment once, nothing animates at rest, no horizontal scroll). The badge
sweep was checked separately by moving `badges_seen_at` before the seeded badges. No
console error and no hydration warning; headless Chromium logs "GPU stall due to
ReadPixels" for the orb and `motion` its reduced-motion notice. Run-created trades
were found by `created_at` and deleted.

- Agreed before implementation: no schema change, so `users.badges_seen_at` now means
  "Progress last seen". The moment plays when an entry the streak can see (missed
  setups in, practice-only trades out) was logged or a badge earned since then, and
  the page marks it seen after render.
- Badge thresholds live in one table in `src/domain/badges.ts` that both awarding and
  `badgeProgressOf`/`nextUpBadges` read. `getProgressCounters` and `hasProgressMoment`
  in `src/db/queries/progress.ts`, with Postgres tests for counters, best frozen score,
  reviewed weeks, ownership, real accounts only and the moment.
- The heatmap's trading weeks are `heatmapWeeks` in `src/domain/progress.ts`. The ring's
  arc shares are mark placement, so they sit in `src/lib/progress/ring.ts`, as
  coding-standards → Charts asks, not in the domain as the ticket's wording suggests.
  `calculateStreak` now also returns every grace day (`graceDays`), so the heatmap
  dashes each month's, as its legend says.
- Pulse and sweep mount after hydration (`src/hooks/use-process-moment.ts`): the
  server cannot know the reduced-motion preference, and rendering them there failed
  to hydrate under reduced motion.
- Fixed from review: practice-only trades no longer trigger the moment; grace days of
  earlier months dashed; future days in the week strip no longer dashed like a grace
  day; the week strip and the score ring are Server Components; values not in
  `muted-foreground`; the ring SVG has no `viewBox`.
- Removed with their last use: `badge-grid`, `score-breakdown`, `score-history`,
  `status-card`, `streak-explanation`, `unlocked-card`, `weekly-review-link`, and the
  tokens `--color-warning-dim` and `--shadow-notice-amber`. With them the frozen month
  history and the written streak rules left the page; prototype D dropped both.
- Kept from the old page or the prototype: the "New" mark on a badge earned since the
  last visit, the month-end note on "Dialled In", "Open review" once this week's review
  is written.
- Open: `markBadgesSeen` reports failure without logging it (inherited from the unlock
  card); the page builds the badge view model inline and is long; `sync.ts` and the
  page assemble `BadgeProgress` separately.
