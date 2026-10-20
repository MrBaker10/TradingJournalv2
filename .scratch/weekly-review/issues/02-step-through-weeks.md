# 02: Step through review weeks and catch up past weeks

**What to build:** On the weekly review page the user steps to the previous and next
review week via a search parameter and can write or edit the review of any past week.
Stepping never goes beyond the current week, and saving a future week is refused
server-side. The page indicates which past weeks already have a review, so gaps are
visible.

Spec: `.scratch/weekly-review/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01

**Status:** done

- [x] Week selected by search parameter; an invalid or future value falls back to the current week.
- [x] Next-week control is unavailable on the current week.
- [x] Save action refuses a week start that is not a Sunday or lies in the future (in the user's timezone). Server side already in place since ticket 01 (review fix, so a review typed across Saturday midnight is not lost); this ticket adds the UI around it.
- [x] Query lists the week starts that have a review in a range; the page uses it to mark reviewed weeks. Decided: a strip of the last eight weeks under the stepper, each with a cyan dot when reviewed and a hollow one when open (Design.md §4.26). A marker on the stepper alone shows one week at a time and hides gaps. A review whose three fields were all cleared does not count as written.
- [x] DB tests (executed): range listing returns only the user's own reviewed weeks; future week start refused.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: step back, write and save a past week, edit it, try to step past the current week; no new console errors.

## Review

Two-axis review (standards, spec) against `4f175a7` on 2026-10-20, uncommitted tree.

Fixed:
- Strip dot was 6px (`h-1.5`) while Design.md §4.26 says 8px; now `h-2 w-2`.
- The strip's weeks were derived twice (page range, nav list); one pure
  `recentReviewWeeks` in the domain now feeds both, with a Vitest case, and the page
  no longer imports a constant from a component.
- Stepper chevrons repeated one class string three times; one `WeekStep`, the
  calendar's `MonthStep` as a link.
- Date props in the nav typed as `IsoDate` like the domain and queries; `raw` renamed
  `rawParams` as on the journal page.

Left as is:
- "DB tests: future week start refused": the refusal is pure logic in the save action
  (`reviewWeekPosition(...) === "future"`), covered by Vitest domain tests
  (`reviewWeekPosition`, `resolveReviewWeek`), not a DB test. The repo has no action
  test harness; the one-line guard itself stays untested. Browser: future `?week=`
  opens the current week, no next step on the current week.
- The Progress card now uses `listReviewedWeekStarts`, so a review whose fields were
  all cleared counts as not reviewed there too, consistent with the strip.
- `ISO_DATE_PATTERN` is one more copy of an ISO-date regex that already exists in
  several places; a shared helper is a refactor outside this ticket.
- `listReviewedWeekStarts(id, week, week)` as a yes/no on Progress: reads fine with the
  named result, no second query function needed.
