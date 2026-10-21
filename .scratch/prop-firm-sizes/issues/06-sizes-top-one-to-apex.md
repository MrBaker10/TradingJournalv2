# 06: Sizes for Top One Futures, BluSky, Funded Futures Family, Lucid Trading, Apex Trader Funding

**What to build:** For each of these five prop firms, `context/PropFirmsData.md` lists
every currently sold account size of its existing product line(s) as its own program,
with all eighteen fields and size-neutral summary tags, and the firm's website and
"Last verified" date. Rules come from the firm's own pages only (website, help center,
FAQ, T&Cs, checkout); no review or affiliate sites, no Discord. Conflicts between a
firm's own pages stay as text; anything not found stays unknown. The existing 50k
program is re-checked and keeps its name. After the user has reviewed the diff, the
data is seeded and appears on the Prop Firm Rules page and in the program select.

Spec: `.scratch/prop-firm-sizes/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01 (Firm blocks with several programs)

**Status:** ready-for-agent

- [ ] Research note for this batch under `.scratch/prop-firm-sizes/` with the source URLs per firm and per program, and the date checked.
- [ ] Every currently sold size of each firm's existing product line(s) as its own program, named `<product line> <N>k` in the firm's own style, in ascending size order.
- [ ] Existing 50k program names unchanged; their fields re-checked.
- [ ] No invented values: unknown stays unknown, conflicts carried as text.
- [ ] `Firm website` (https) and `Last verified` set per firm, only once all its programs are checked.
- [ ] Parser suite against the real file passes.
- [ ] User reviewed the diff before seeding; seed run locally per `context/operations.md`.
- [ ] Browser: the five firms show their sizes on the Prop Firm Rules page and in the program select; no new console errors.

## Review
