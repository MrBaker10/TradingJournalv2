# 04: Daily loss limit and consistency rule

**What to build:** The rule status shows today's net against the daily loss limit, with
the distance left, and the best day against total profit and the consistency limit. Both
are marked ok, close or breached. The consistency check is skipped while total profit is
zero or negative.

Spec: `.scratch/prop-firm-link/spec.md` (Domain module → daily loss limit, consistency,
"Close" threshold).

**Blocked by:** 02 (Rule status in settings)

**Status:** ready-for-agent

- [ ] Daily loss limit: today's trading day net vs limit; close within 20 % of the remaining allowance; earlier days never count.
- [ ] Consistency: best day ÷ total profit vs percentage, only when total profit > 0; close within 5 percentage points (named constant).
- [ ] Both unset → `not_set`.
- [ ] `context/Design.md` names the 5-point consistency threshold next to the 20 % one.
- [ ] Vitest: daily loss ok/close/breached on today only; boundary exactly at 20 %; consistency skipped at zero and negative total; consistency close and breached boundaries.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: settings detail shows both rules; no new console errors.
