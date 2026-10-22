# 05: Sizes for Futures Elite, Tradeify, Take Profit Trader, My Funded Futures, FundedNext

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

Decisions (2026-10-22): FundedNext's former Rapid is discontinued; the Rapid Pro path
continues "Futures Rapid 50k" under its name, Rapid Daily only in Notes. Tradeify: Select
Daily Payout only, including the limited 300k. Summary tags that are wrong for the funded
stage removed (MFFU and TPT "EOD", Tradeify "No DLL"). propfirmmatch.com allowed as a size
checklist (spec, Data collection); the cross-check found no missing size.

## Review

Standards:
- Test name "keeps the existing 50k program names…" undersold a test that pins every
  program name of the five firms. Fixed: renamed.
- Size-order test compares `Number(accountSizeUsd)`: a sort, not money arithmetic, and the
  fields test already rules out null sizes. Left open on purpose.
- Name list in the test must change with every data edit for these five firms. Accepted:
  it pins this batch's curation result.

Spec:
- Tradeify 300k funded DLL lacked "soft breach" while its siblings had it; the firm's DLL
  article applies it to all Select Daily funded accounts. Fixed.
- Tradeify 300k first payout names no minimum and min trading days no 50% add-on: the 300k
  article states neither, so unknown stays unknown. No change.
- MFFU 7-day inactivity only in the 25k Notes: only the 25k article states it. No change.
- Research note lists sources per firm, not per program: each cited page covers all sizes
  (MFFU has per-size articles and cites them). Accepted.
- Accounts already linked to "Futures Rapid 50k" now show Rapid Pro reference text, also if
  they are legacy Rapid accounts. Follows from the agreed decision; a discontinued marker is
  out of scope (spec).
