# 05: Detect which source pages changed

**What to build:** One command fetches every page on the source list, extracts its readable
text and compares it with the text seen at the last data refresh, then reports per firm:
changed, unchanged or failed (with the HTTP status or error). It saves the new text in the
repo so the change shows in a diff, and never touches the prop firm data file or a
database. Its first run records the starting texts.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Source list, Data refresh.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Spike first: try text extraction without a new dependency against the real sources and record the result in this ticket. If a dependency is needed, stop and ask the user before adding it.
- [ ] Extracting the text and comparing it with the saved text are pure functions, covered by Vitest with fixture HTML; no test fetches the network.
- [ ] A page that cannot be fetched is reported as failed, never as unchanged, and its saved text is kept.
- [ ] Two runs in a row without a change on the firms' side report every reachable source as unchanged (no false changes from page furniture).
- [ ] The first run's saved texts are committed with this ticket.
- [ ] Full gate; no browser check needed (no screen changes), stated as such.
