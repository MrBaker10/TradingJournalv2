# 03: EOD trailing drawdown with lock level; intraday not checkable

**What to build:** For an EOD trailing drawdown, the rule status shows a floor that
follows the highest end-of-day balance minus the amount, rises only on new end-of-day
highs, never falls, and stops at the lock level when one is set. An intraday trailing
drawdown always shows as "not checkable" instead of a floor, so the user is never shown
a wrong number.

Spec: `.scratch/prop-firm-link/spec.md` (Domain module → drawdown EOD trailing,
intraday trailing).

**Blocked by:** 02 (Rule status in settings)

**Status:** ready-for-agent

- [ ] EOD trailing floor = highest end-of-day balance − amount, ratcheting only on new EOD highs, capped at the lock level when set.
- [ ] Same ok/close/breached thresholds as the static floor.
- [ ] Intraday trailing returns `not_checkable` with no floor figure.
- [ ] Vitest: ratchets on new highs only; never moves down after a losing day; lock level caps the floor; intraday trailing `not_checkable`.
- [ ] `context/Design.md`: rule status section covers the "not checkable" display.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: settings detail for an EOD trailing and an intraday trailing account; no new console errors.
