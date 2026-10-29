# 04: Setup guide — completion

**What to build:** When a user with an `active` guide has both required steps done, the
next dashboard visit shows the card once more in its completed form: one light sweep in
the `process` colour passes over it, the state is written as `completed`, and the card
leaves. No confetti, toast or badge. With reduced motion the card is simply gone.

**Blocked by:** 02 (Setup guide — question and step list).

Status: done

## Acceptance

- [x] Active guide, add an account and log a missed setup, open the dashboard: the
      sweep plays once and the card leaves; a reload shows no card.
- [x] The state is `completed` afterwards and Settings offers no switch.
- [x] With reduced motion, the same path shows no animation and no card.
- [x] A user who declined or hid the guide and then completes both required steps gets
      no sweep.
- [x] Domain and real Postgres tests cover the completion view and the write of
      `completed`; none skipped.
- [x] The sweep follows the process-moment motion in Design.md §3.6 in both themes; no
      new console errors.

## Review

Baseline: HEAD `b39b256`. Two independent axes via the code-review skill.

- Domain: a `complete` action, allowed only from the completion view, leads to
  `completed`. The completion card writes it once on mount without revalidating,
  like the streak tile's `markDashboardSeen`, so a re-render never cuts the sweep and
  leaving the dashboard early still spends the moment.
- Standards: the fold animated `height`; it now moves `max-height` from the measured
  card height (coding-standards.md, Motion). Contradiction reported to the user: the
  fold shifts the dashboard up although Design.md §4 says "none that shifts layout";
  the user accepted the 300 ms fold. Kept: the sweep copied from the badge row (a
  shared component would refactor outside the ticket), `pb-6` on the card so card and
  gap fold together.
- Spec: an earlier draft wrote `completed` after the animation, citing the streak
  tile wrongly; fixed as above. A sentence added to Design.md was reverted, because the
  spec says Design.md stays unchanged for the completion. The Postgres test reaches
  `declined` through the action.
- Verification: lint, typecheck, full test suite (1558 passed, none skipped) and build
  pass. One earlier full run failed with "too many clients" (98 idle connections from
  the dev server after many hot reloads); after the user restarted `pnpm dev` the
  suite passed. Browser: an active guide with a practice account and a missed setup
  shows the sweep once, the card leaves after about 2.4 s, the state is `completed`, a
  reload shows no card and Settings no switch (Dark at 1280 px, Light at 390 px,
  mid-sweep screenshots show the `process` band); leaving after 300 ms still writes
  `completed`; with reduced motion the card is never visible and the state is
  `completed`; a user who answered No and then finished both steps sees nothing and
  stays `declined`. No console errors beyond the known WebGL and reduced-motion
  notices.
