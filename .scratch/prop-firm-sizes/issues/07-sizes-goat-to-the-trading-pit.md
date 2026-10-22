# 07: Sizes for Goat Funded Futures, Legends Trading, E8 Markets, TradeDay, The Trading Pit

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
- [x] Existing 50k program names unchanged; their fields re-checked. Superseded: names follow the firm's website (see Decisions).
- [x] No invented values: unknown stays unknown, conflicts carried as text.
- [x] `Firm website` (https) and `Last verified` set per firm, only once all its programs are checked.
- [x] Parser suite against the real file passes.
- [x] User reviewed the diff before seeding; seed run locally per `context/operations.md`.
- [x] Browser: the five firms show their sizes on the Prop Firm Rules page and in the program select; no new console errors.

Decisions (2026-10-22): Program names follow the firm's website (user), so four 50k names
change: Goat "50k EOD" → "EOD 50k", Legends "Elite Master 50k" → "50k Elite", E8
"Signature Futures 50k" → "E8 Signature 50k", TradeDay "50k EOD" → "Quick Pay EOD 50k".
TradeDay's existing line is Quick Pay EOD; Quick Pay Intraday and Fast Pass EOD are other
product lines (out of scope). TradeDay carries no split tag (50% below $4,000 current
profit, 80% above).

## Review

Standards:
- Name reversal recorded only in the ticket. Fixed: superseding entry in
  `context/decisions.md`; spec story 33 marked superseded.
- Operations paragraph read as a history log and did not say who runs production. Fixed:
  states it is pending on both Neon branches and that production is Sascha's step; the
  SQL stays, since it is the step to run.
- Rename mapping appears in ticket, research note and operations SQL. Kept: the ticket
  and note record the decision, the SQL is the executable step.
- TradeDay quoted with single quotes. Fixed: double quotes as in earlier blocks.
- Legends names are size-first ("50k Elite"), as on the firm's site. No change.

Spec:
- Goat winning-day amounts for 100k/150k were derived from the 0.2% rule. Fixed: the rule
  only; the dollar amount stays for 50k, where the firm states it.
- TradeDay "EOD" tag fits the eval; Quick Pay Funded Sim uses an intraday drawdown.
  Accepted: the product line is "End of Day"; the field text says so.
- Rename must run before seeding a Neon branch, nothing enforces it. Accepted: documented
  in `context/operations.md`.
- Spot checks of Goat and TradeDay values against the firms' pages matched.
