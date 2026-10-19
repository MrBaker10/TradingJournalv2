# 03: EOD trailing drawdown with lock level; intraday not checkable

**What to build:** For an EOD trailing drawdown, the rule status shows a floor that
follows the highest end-of-day balance minus the amount, rises only on new end-of-day
highs, never falls, and stops at the lock level when one is set. An intraday trailing
drawdown always shows as "not checkable" instead of a floor, so the user is never shown
a wrong number.

Spec: `.scratch/prop-firm-link/spec.md` (Domain module → drawdown EOD trailing,
intraday trailing).

**Blocked by:** 02 (Rule status in settings)

**Status:** done

- [x] EOD trailing floor = highest end-of-day balance − amount, ratcheting only on new EOD highs, capped at the lock level when set.
- [x] Same ok/close/breached thresholds as the static floor.
- [x] Intraday trailing returns `not_checkable` with no floor figure.
- [x] Vitest: ratchets on new highs only; never moves down after a losing day; lock level caps the floor; intraday trailing `not_checkable`.
- [x] `context/Design.md`: rule status section covers the "not checkable" display.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: settings detail for an EOD trailing and an intraday trailing account; no new console errors.

## Review

Two-axis review (standards, spec) against `4683465` on 2026-10-19, uncommitted tree.

Fixed:
- A lock level under the starting floor let the floor drop on the first new high
  (`min(high − amount, lock)` without a lower bound). The floor now only ever rises:
  `max(floor, min(high − amount, lock))`; Vitest case added, Design.md names it.
- One exhaustive `switch` on the drawdown type (`evaluateDrawdown`, `never` default)
  instead of two separate checks; static and EOD trailing share `walkFloor`.
- The end-of-day balances are computed once and feed both the profit target and the
  floor walk, instead of two running sums.
- Design.md paragraph heading names tickets 02–03.
- After the checkpoint (asked by Sascha): Vitest case for a close landing exactly on
  a floor the lock level holds (breached, distance 0); a mutation dropping the lock
  cap fails it.

Left open on purpose:
- `rules` and `ruleStatus` still travel side by side for daily loss and consistency
  until ticket 04.

Browser (2026-10-19, local dev, "Lucid 25k Eval", $25,000 start, $1,500 drawdown,
evaluation start 2026-01-01): EOD trailing, lock 25,100 → "$1,500.00 to floor
$24,521.35" (the last close is the highest); intraday trailing → "Not checkable — no
intraday balance", no floor; EOD trailing, lock 24,000 → "$2,021.35 to floor
$24,000.00". No console errors. The link stays as EOD trailing with lock 24,000.

After the checkpoint (decided by Sascha): a lock level under the starting floor stays
accepted when linking; it simply has no effect, since the floor never falls.
