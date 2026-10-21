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

**Status:** ready-for-agent

- [ ] URL state carries a list of sizes; parse and build round-trip; invalid values dropped; tags, search and compare unchanged.
- [ ] Query filters programs by sizes (OR), tags (AND) and search, combined with AND; null account size never matches a size filter.
- [ ] Size chips are the distinct non-null account sizes, ascending, labelled in "50k" form.
- [ ] Firm card shows only matching sizes; preselection uses the single filtered size when exactly one is filtered (after compare, before smallest size).
- [ ] Unit tests for URL sizes and preselection (Seam 3); DB query tests for size filter combinations and size chips (Seam 2), executed, not skipped.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: filter one size, two sizes, combine with a tag and a search ("100k"), reload keeps the view; no new console errors.

## Review
