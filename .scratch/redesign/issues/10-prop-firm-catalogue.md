# 10: Prop Firm Rules as a catalogue

**What to build:** Prop Firm Rules starts from the account size. A size control offers
"Any size" and every known size, preselected to the size of a linked real account or
"Any size". Below it one card per program at that size with six key figures (size,
target, max drawdown, daily loss, min days, split) and its tags; programs the trader's
real accounts are linked to come first and carry the account's name. A card's clickable
area is the firm name and figures; the compare toggle is a sibling, never a button
inside a button. A card opens the firm in the medium sheet: website, verified date, the
firm's program switcher in the head, key figures, tags and all 18 rules in one column.
Up to three programs go into an inline compare panel above the cards, verbatim, no
column sorted, no winner marked, with a dot on rows whose wording differs. A missing
rule reads "Not recorded". Search, size, tag chips and the compare selection stay in the
URL as today; the rows are filtered in the query as today. Key figures are shown as the
data file writes them, truncated with the full text on hover; nothing parses them.

Spec: `.scratch/redesign/spec.md` → Prop Firm Rules, Reference catalogue pattern.
Design: `context/Design.md`. Data: `context/PropFirmsData.md`. Source: the winning view
on `prototype/redesign-prop-firms` and the verdict in its commit body; rewrite, do not
copy.

**Blocked by:** 05 (Detail sheet and trade detail page)

**Status:** ready-for-agent

- [ ] A new query returns the current user's account-to-program links with account names, scoped like the queries beside it and excluding practice accounts; a query test against Postgres covers ownership and the practice exclusion.
- [ ] Size control preselects the linked account's size when there is one, else "Any size"; changing it updates the URL and the cards; the preselection rule is a lib function with Vitest tests beside the existing URL-state tests.
- [ ] Cards show the six key figures as written, truncated with the full text on hover, and the tags; linked programs come first with the account name; a program without a figure shows "Not recorded".
- [ ] Clicking the name or figures opens the sheet; the compare toggle is a separate control; a clean load has no hydration warning.
- [ ] Sheet shows website (https anchor), verified date, program switcher in the head that switches without closing, key figures, tags and all 18 rules; Esc closes it.
- [ ] Compare panel holds up to three programs verbatim above the cards; rows whose wording differs carry a dot; nothing is sorted or marked as a winner; the selection survives a reload through the URL.
- [ ] Search, size and tag chips filter in the query as today; the existing prop-firm URL-state tests still pass.
- [ ] Old prop-firm components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open with a linked account, change size, search, open a card, switch program in the sheet, Esc, compare three programs, reload; reduced motion emulated once; no new console errors.

## Do not build

- Parsing, sorting or filtering by numeric rule values; that is a separate data model decision.
- New rules, firms or data fields.
- A winner, score or recommendation.
