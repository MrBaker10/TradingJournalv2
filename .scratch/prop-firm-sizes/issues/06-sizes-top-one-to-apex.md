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

**Status:** done

- [x] Research note for this batch under `.scratch/prop-firm-sizes/` with the source URLs per firm and per program, and the date checked.
- [x] Every currently sold size of each firm's existing product line(s) as its own program, named `<product line> <N>k` in the firm's own style, in ascending size order.
- [x] Existing 50k program names unchanged; their fields re-checked.
- [x] No invented values: unknown stays unknown, conflicts carried as text.
- [x] `Firm website` (https) and `Last verified` set per firm, only once all its programs are checked.
- [x] Parser suite against the real file passes.
- [x] User reviewed the diff before seeding; seed run locally per `context/operations.md`.
- [x] Browser: the five firms show their sizes on the Prop Firm Rules page and in the program select; no new console errors.

Decisions (2026-10-22): Funded Futures Family "Prime Standard/Max" and Apex "Standard /
No Activation EOD" are purchase options of one program per size (the firms' pages say so).
BluSky Propel 150k/200k/300k carry "Static" instead of "EOD" (static drawdown). Lucid's
"No DLL" tag removed (DLL chosen at checkout, no default). FFF split tag 90% per the firm.

## Review

Standards:
- Propel 300k "Min trading days" read differently from its siblings. Fixed: notes that the
  21% consistency rule applies; no day count derived, since the firm states one only for 34%.
- Apex keeps two summary tags and its size-first names ("25k EOD"), as the existing 50k
  did. No change.
- Conflicts kept in Notes as in ticket 05. No change.

Spec:
- Apex sources were help-center ids without URLs. Fixed: REST article URLs per id.
- Research note did not say the cited articles cover every size. Fixed: "All sizes per
  article" per firm.
- BluSky "Static" tag: tag chips combine with AND, so filtering "EOD" hides BluSky
  150k–300k. Correct per the firm's static drawdown; accepted.
- Spot checks of BluSky, FFF and Top One values against the firms' pages matched.
