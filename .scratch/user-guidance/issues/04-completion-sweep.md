# 04: Setup guide — completion

**What to build:** When a user with an `active` guide has both required steps done, the
next dashboard visit shows the card once more in its completed form: one light sweep in
the `process` colour passes over it, the state is written as `completed`, and the card
leaves. No confetti, toast or badge. With reduced motion the card is simply gone.

**Blocked by:** 02 (Setup guide — question and step list).

Status: ready-for-agent

## Acceptance

- [ ] Active guide, add an account and log a missed setup, open the dashboard: the
      sweep plays once and the card leaves; a reload shows no card.
- [ ] The state is `completed` afterwards and Settings offers no switch.
- [ ] With reduced motion, the same path shows no animation and no card.
- [ ] A user who declined or hid the guide and then completes both required steps gets
      no sweep.
- [ ] Domain and real Postgres tests cover the completion view and the write of
      `completed`; none skipped.
- [ ] The sweep follows the process-moment motion in Design.md §3.6 in both themes; no
      new console errors.
