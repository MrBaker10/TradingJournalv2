# 11: Acceptance sweep and German text review

**What to build:** The whole feature checked end to end: every Acceptance step of the
spec, and a review of the German texts per area by the maintainer, with corrections
applied. After this the spec can be marked done and the branch merged.

**Blocked by:** 02, 03, 04, 05, 06, 07, 08, 09, 10.

Status: ready-for-agent

## Acceptance

- [ ] Spec Acceptance steps 1–14 pass in the browser; results recorded here under
      `## Review`.
- [ ] A search of the interface code finds no hard-coded English interface text
      outside the dictionaries.
- [ ] The maintainer has reviewed the German texts per area; corrections applied.
- [ ] `context/project-overview.md` → Decisions records the interface language
      decision with a pointer to ADR 0008.
- [ ] Full ordered verification gate passes once on the final state; database tests
      executed, none skipped.
