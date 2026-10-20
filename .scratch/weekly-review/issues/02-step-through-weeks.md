# 02: Step through review weeks and catch up past weeks

**What to build:** On the weekly review page the user steps to the previous and next
review week via a search parameter and can write or edit the review of any past week.
Stepping never goes beyond the current week, and saving a future week is refused
server-side. The page indicates which past weeks already have a review, so gaps are
visible.

Spec: `.scratch/weekly-review/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Week selected by search parameter; an invalid or future value falls back to the current week.
- [ ] Next-week control is unavailable on the current week.
- [ ] Save action refuses a week start that is not a Sunday or lies in the future (in the user's timezone). Server side already in place since ticket 01 (review fix, so a review typed across Saturday midnight is not lost); this ticket adds the UI around it.
- [ ] Query lists the week starts that have a review in a range; the page uses it to mark reviewed weeks. Open question: marker on the stepper or a short list of recent weeks — decide from `context/Design.md` and record it here.
- [ ] DB tests (executed): range listing returns only the user's own reviewed weeks; future week start refused.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: step back, write and save a past week, edit it, try to step past the current week; no new console errors.
