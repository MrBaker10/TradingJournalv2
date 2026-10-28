# 04: Source list for every prop firm

**What to build:** Every prop firm's official source pages are recorded in one file in the
repo, so each data refresh checks the same pages. It is filled from the research notes of
the prop-firm-sizes feature, official pages only (firm website, help center, FAQ, terms,
checkout). A test keeps the list in step with the prop firm data file.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Prop firm, Source list.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The source list holds, per firm, every official URL the research notes cite for it; no review, affiliate or community sites.
- [ ] A small parser reads the source list, covered by Vitest.
- [ ] A test fails when a firm in the prop firm data file has no entry in the source list, or the source list names a firm the data file does not have, or a URL is not https.
- [ ] Full gate; no browser check needed (no screen changes), stated as such.
