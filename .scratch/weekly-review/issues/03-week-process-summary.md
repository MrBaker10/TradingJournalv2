# 03: Process summary of the review week

**What to build:** Beside the three fields the page shows a read-only summary of the
selected review week over all real accounts: logged days, the by-the-book share, the top
three mistakes with their counts and the number of missed setups. It is always computed
from the trades, so editing a trade updates past summaries. A week without trades shows a
calm empty state, and the review can still be written.

Spec: `.scratch/weekly-review/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Summary aggregated in SQL in the `weekly-reviews` query module, scoped to all real accounts with the existing scope helpers; practice excluded; a trade on several accounts counts once.
- [ ] Missed setups (`taken = false`) count as logged and as missed setups.
- [ ] Empty state for a week without entries.
- [ ] DB tests (executed): a Sunday trade belongs to the week it opens, a Saturday trade has no week effect; practice-only trades excluded; copy trade counted once; missed setups counted; top three mistakes ordered by count.
- [ ] No effect on consistency score, streak or badges.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: summary for a week with trades and an empty week; no new console errors.
