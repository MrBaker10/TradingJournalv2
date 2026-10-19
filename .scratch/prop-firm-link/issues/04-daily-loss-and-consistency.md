# 04: Daily loss limit and consistency rule

**What to build:** The rule status shows today's net against the daily loss limit, with
the distance left, and the best day against total profit and the consistency limit. Both
are marked ok, close or breached. The consistency check is skipped while total profit is
zero or negative.

Spec: `.scratch/prop-firm-link/spec.md` (Domain module → daily loss limit, consistency,
"Close" threshold).

**Blocked by:** 02 (Rule status in settings)

**Status:** done

- [x] Daily loss limit: today's trading day net vs limit; close within 20 % of the remaining allowance; earlier days never count.
- [x] Consistency: best day ÷ total profit vs percentage, only when total profit > 0; close within 5 percentage points (named constant).
- [x] Both unset → `not_set`.
- [x] `context/Design.md` names the 5-point consistency threshold next to the 20 % one.
- [x] Vitest: daily loss ok/close/breached on today only; boundary exactly at 20 %; consistency skipped at zero and negative total; consistency close and breached boundaries.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: settings detail shows both rules; no new console errors.

## Review

Two-axis review (standards, spec) against `5258c83` on 2026-10-19, uncommitted tree.

Fixed:
- The best day's share comes from the domain (`shareTenthsPercent`, rounded to a tenth)
  instead of float arithmetic in the component.
- One `ruleState(breached, close)` helper instead of three copies of the same
  ok/close/breached cascade; `shareTimesTotal` renamed `bestTimes100`.
- Vitest case for a green day widening the daily room (limit + today's net).
- The panel takes `evaluationStart` instead of the whole rules row, and the drawdown
  line uses the same `JudgedFigure` as daily loss and consistency; nothing reads
  "Pending" any more (closes the item left open in ticket 02).

Left open on purpose:
- Consistency without profit is `status: "ok"` with `checked: false` rather than a new
  status: the spec's status set has no "skipped", and nothing can breach without
  profit.
- The displayed share is rounded; at 50.04 % against a 50 % limit it reads "50.0 %"
  next to "Breached". The state is decided in integers, not from the shown figure.
- `Not set` is rendered by each line separately (three lines).

Browser (2026-10-19, local dev, "Lucid 25k Eval", no trade today): daily loss limit
500, consistency 40 → "Today $0.00 · $500.00 left of $500.00"; "Best day $514.80 ·
50.4 % of $1,021.35 · limit 40 %" with "Breached" in `text-danger-fg`; consistency 55 →
same share, "Close" in `text-warning`. No console errors. A daily loss with a trade
today was not reproducible locally (covered by Vitest).

After the checkpoint (decided by Sascha): the daily loss limit is measured from the
balance at the start of the trading day, as built — a green day widens the room
("$1,300.00 left of $1,000.00"), no cap at the limit. A consistency limit of 1–5 % is
always at least close; accepted, real programs sit at 20–50 %.
