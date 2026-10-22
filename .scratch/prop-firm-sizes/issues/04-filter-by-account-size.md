# 04: Filter by account size

**What to build:** A "Size" chip row joins search and tag chips on the Prop Firm Rules
page. It offers every account size that occurs, ascending, labelled like "50k".
Several sizes combine with OR among themselves; sizes, tags and search combine with
AND. The selection lives in the URL like the other filters, so a reload brings the
view back. A firm card shows only the sizes that match, disappears when none match,
and opens on the filtered size when exactly one size is filtered. A program whose
account size is unknown never matches a size filter.

Spec: `.scratch/prop-firm-sizes/spec.md`. Terms: `GLOSSARY.md`. Design: the section
written in ticket 02.

**Blocked by:** 03 (One card per firm with a size control)

**Status:** done

- [x] URL state carries a list of sizes; parse and build round-trip; invalid values dropped; tags, search and compare unchanged.
- [x] Query filters programs by sizes (OR), tags (AND) and search, combined with AND; null account size never matches a size filter.
- [x] Size chips are the distinct non-null account sizes, ascending, labelled in "50k" form.
- [x] Firm card shows only matching sizes; preselection uses the single filtered size when exactly one is filtered (after compare, before smallest size).
- [x] Unit tests for URL sizes and preselection (Seam 3); DB query tests for size filter combinations and size chips (Seam 2), executed, not skipped.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: filter one size, two sizes, combine with a tag and a search ("100k"), reload keeps the view; no new console errors.

## Review

Two-axis review (standards, spec) of the uncommitted change; fixed before the commit
unless noted.

- Found while testing in the browser: the card's size state started as the preselection, so an untouched card kept a stale size after a filter change → starts as null; only a user's pick is kept, and only while it still matches.
- Spec: Seam 3 had no case for the single filtered size → test with two same-size programs out of position order, and compare still first.
- Spec: the single-filtered-size step has no code in `preselect` → left on purpose: with one size filtered every program on the card is that size, so the smallest-size step lands on it; the comment in `cards.ts` and the new test record it.
- Standards: the cents expression existed twice in the queries → one `ACCOUNT_SIZE_CENTS`, and the size chips order by it instead of `sql\`1\``.
- Standards: the chip classes were copied between the filters and the card's size control → `chip-class.ts`, after `journal/quiet-action-class.ts`.
- Standards: `::int` on `account_size_usd` would round a size with cents → left: the parser only accepts `$NN,NNN`, so a size is whole dollars; commented at the cast.
- Standards: sizes travel as whole USD numbers beside cents elsewhere → left: the spec puts USD integers in the URL; no arithmetic is done on them.
- Standards: `toggleSize` repeats the shape of `toggleTag` → left: two cases do not earn a generic helper.
- Standards: `range-preset-chips.tsx` keeps an older chip variant (150ms, no focus ring) → left: Analytics and journal, outside this ticket.
- Spec: tag chips moved from 150ms to the §5 timing of 200ms, which Design.md §4.28 did not ask for explicitly → kept: one chip primitive for the whole filter card, and §5 sets 200ms for colour and border changes.
