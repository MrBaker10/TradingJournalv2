# Spec: Prop firm programs in every account size

Status: ready-for-agent

Roadmap: `context/project-overview.md` → H) Prop Firm Rules; narrows the Future item
"Component-level design for Prop Firm Rules". Terms: `GLOSSARY.md` (Prop firm program,
Product line, Linked account, Account rules). Decisions: `docs/adr/0001-user-entered-account-rules.md`.
Builds on: `.scratch/prop-firm-link/`.

## Problem Statement

The prop firm reference holds fifteen firms with exactly one program each, and every
one of them is the 50k size. A trader who bought a 100k or 150k evaluation cannot find
their program: when linking the account they either pick the 50k program, so the rule
text shown beside each field is wrong for their account, or they cannot link at all.
On the Prop Firm Rules page they can only read and compare the 50k rules, although
targets, drawdowns, daily loss limits, contract caps and payout caps all change with
the size. The page itself would not cope with the full range either: a flat list of
one card per program, and a chip bar built from every summary tag, which already holds
size-bound tags such as "50k EOD" and "$3,000 target".

## Solution

`context/PropFirmsData.md` carries every currently sold account size of each firm's
existing product lines, collected from the firm's own pages only, with sources noted
and each firm's "Last verified" date set once all its programs are checked. A firm
block holds several programs, one per size, in the order the curator writes them.
Summary tags are size-neutral, and the account size is read as a number so it can be
filtered on.

The Prop Firm Rules page shows one card per firm. A size control on the card switches
between the firm's programs; the collapsed card shows firm, product line, size control,
the selected program's tags, "Last verified" and the website link, and the expanded
card shows the eighteen fields of the selected size, as today. A "Size" chip row joins
the search and tag chips. Compare still picks programs, so two sizes of one firm can sit
side by side. In account settings, the program select groups programs by firm in file
order, so the 25k to 150k programs of a firm read in size order.

## User Stories

1. As a prop trader with a 100k evaluation, I want to find my exact program in the list, so that I can link my account to what I bought.
2. As a prop trader linking an account, I want the rule text beside each field to match my account size, so that I type the right numbers.
3. As a prop trader, I want the program select in account settings grouped by firm, so that I find my firm first and then my size.
4. As a prop trader, I want the sizes of a firm listed smallest to largest in the program select, so that the list reads naturally.
5. As a prop trader whose account is already linked to a 50k program, I want that link untouched by the new data, so that my rule status does not move.
6. As a prop trader, I want to see one card per firm on the Prop Firm Rules page, so that the page stays scannable with many programs.
7. As a prop trader, I want a size control on each firm card, so that I can switch between the firm's account sizes without leaving the card.
8. As a prop trader, I want the collapsed card to show the selected program's summary tags, so that a size-specific split or drawdown type is visible at a glance.
9. As a prop trader, I want the expanded card to show all eighteen fields of the selected size, so that I read the rules of the size I care about.
10. As a prop trader, I want each firm's "Last verified" date and website on the card, so that I know how fresh the rules are and where to check them.
11. As a prop trader, I want to filter by account size, so that I only see programs in the size I trade.
12. As a prop trader, I want to select several sizes at once, so that I can look at 50k and 100k programs together.
13. As a prop trader, I want the size filter to combine with search and tag chips, so that "100k, EOD, No DLL" narrows to exactly those programs.
14. As a prop trader, I want a firm card to show only the sizes that match my filters, so that I never land on a size I filtered out.
15. As a prop trader, I want a firm card to disappear when none of its programs match, so that the list only shows relevant firms.
16. As a prop trader, I want the card to preselect the smallest matching size, so that it opens on a sensible default.
17. As a prop trader filtering one size, I want every card to open on that size, so that I do not have to switch each card by hand.
18. As a prop trader comparing programs, I want a card to open on the size I put into compare, so that the card and the compare table agree.
19. As a prop trader, I want the size filter kept in the URL, so that a reload or a saved link brings back the same view.
20. As a prop trader, I want the size chips in ascending order, so that the row reads 25k, 50k, 100k, 150k.
21. As a prop trader, I want the tag chips free of amounts and sizes, so that the chip bar stays short and every chip means the same thing for every size.
22. As a prop trader, I want search to find programs by size in their name, such as "100k", so that typing works as well as clicking.
23. As a prop trader, I want to compare up to three programs, including two sizes of the same firm, so that I see how the rules scale.
24. As a prop trader, I want each compare column headed "Firm · Program", so that I know which size each column shows.
25. As a prop trader, I want the compare button on a card to add the size currently selected, so that I compare what I am looking at.
26. As a prop trader, I want conflicts between a firm's own pages carried through as written, so that I see the disagreement rather than a guess.
27. As a prop trader, I want unknown fields shown as unknown, so that a gap is never mistaken for "none".
28. As the curator, I want each firm block to list its programs under their own subheadings, so that the file stays readable by hand.
29. As the curator, I want firm website and "Last verified" written once per firm, so that they cannot drift between programs.
30. As the curator, I want the program order on the page and in the select to follow the file, so that I control it without a separate setting.
31. As the curator, I want seeding to fail on an account size that is not a plain dollar amount, so that the size filter never silently misses a program.
32. As the curator, I want seeding to fail on a summary tag that contains an amount or a size, so that the chip bar stays size-neutral.
33. As the curator, I want existing program names kept, so that re-seeding updates the linked programs in place instead of orphaning them.
34. As the curator, I want new programs named "<product line> <N>k" in the firm's own style, so that names stay consistent.
35. As the curator, I want each firm's sources recorded beside the research, so that I can re-verify the rules later.
36. As the curator, I want to review each batch of firms before it is seeded, so that nothing lands unchecked.
37. As the curator, I want a missing program to be added by editing the file and re-seeding, so that there is one way in.

## Implementation Decisions

- **Program = one product line at one account size** (GLOSSARY.md). No variant table;
  `prop_firm_programs` already keys on firm plus name and keeps one row per size.
- **File format.** `## <Firm>` opens a firm block and carries the firm fields
  (`Firm website`, `Last verified`). Each program follows as `### <Program name>`, with
  its summary tags and the eighteen rule fields in their current order. A firm block
  without a program, a program heading outside a firm, a duplicate program name within
  a firm, or a firm field inside a program block is a parse error. All other existing
  strictness rules stay.
- **Existing data moves, not changes.** The fifteen current programs move into the new
  format with their names unchanged. Size-bound summary tags ("50k EOD", "$3,000
  target", "$2,700") are rewritten to size-neutral form or dropped. That is the only
  content change in the format ticket.
- **Position.** New integer column on programs holding the 1-based position within its
  firm, taken from file order. Lists order by firm name, then position; this replaces
  the order by program name in the page, compare lookup and program select queries.
- **Account size as a number.** New nullable numeric column holding the account size in
  USD, read strictly from the `Account size` field: only the form `$NN,NNN` (dollar
  sign, digits, thousands commas) parses; anything else fails the seed with the line
  number. Unknown (no value) stays null and the program then matches no size filter.
  The text field stays as written. This is a deliberate exception to "never derive a
  number from rule text", for this one field only, because the account size is a
  product fact and not a rule to interpret; record it in `context/decisions.md`.
- **Size-neutral tags.** The parser rejects a summary tag containing `$` or a size token
  (a number followed by `k`/`K`). The existing "target" rejoin becomes unnecessary once
  the target line is gone from tags; keep or remove it as the tests dictate.
- **Seeder.** Stays a thin idempotent upsert over the parser on `(firm, name)`, now
  writing position and account size. Still inserts and updates only; nothing is deleted.
  Re-seeding never touches `account_rules` (ADR 0001).
- **Page state.** The URL state gains a list of sizes (integers, USD), parsed and built
  like tags; invalid values are dropped. Tag, search and compare handling are unchanged.
- **Filter semantics.** Search, tags and sizes filter programs. Tags combine with AND
  (as today), sizes with OR among themselves, and the three groups with AND.
- **Chip sources.** Size chips are the distinct non-null account sizes, ascending,
  labelled in the "50k" form. Tag chips stay the distinct summary tags, alphabetical.
- **Firm cards.** A new pure module groups the filtered program rows into firm cards in
  firm order, each with its matching programs in position order, and picks the
  preselected program: a program of that firm in the compare selection wins, else the
  single filtered size if exactly one size is filtered, else the smallest matching size,
  else the first program by position. The card's size choice is local UI state, not in
  the URL.
- **Compare.** Unchanged cap of three programs, looked up by id regardless of filters.
  Column header shows firm and program name. The card's compare action targets the
  selected program.
- **Program select (account settings).** Native `<select>` with one `<optgroup>` per
  firm, programs in position order. No combobox. The linked-program reference text keeps
  showing the selected program's fields.
- **Design.** Component-level design for the firm card, size control, size chip row and
  compare header goes into `context/Design.md` (section 4) before the UI is built, using
  existing tokens and primitives. Dark only, no glow on rule values.
- **Data collection.** Per firm: every currently sold size of its existing product
  line(s), from official sources only (firm website, help center, FAQ, T&Cs, checkout).
  No review or affiliate sites, no Discord. Sources go into a research note per batch
  under this feature's `.scratch/` directory, not into `PropFirmsData.md`. Conflicts stay
  as text; unknown stays unknown. "Last verified" is set per firm only when all its
  programs, including the existing 50k one, have been checked.
- **Docs.** Narrow the Future item in `context/project-overview.md` to what remains
  (rule detail table, richer compare); update section H to "programs per account size".
  Both need the user's OK on wording.

## Testing Decisions

- A good test drives the public interface and asserts what a trader or curator would
  see: parsed programs, filtered rows, chosen card defaults. No assertions on internals.
- **Seam 1: `parsePropFirms`** (prior art: its existing suite). Cases: several `###`
  programs per firm in file order with positions 1..n; firm fields read at firm level
  and rejected inside a program; missing program, stray program heading and duplicate
  program name fail; account size `$50,000` → 50000, `$150,000` → 150000, missing →
  null, `50k`, `$50,000 (EOD)`, `$50.000` fail; tags with `$` or `50k`/`100K` fail. The
  suite against the real `context/PropFirmsData.md` keeps passing after every data
  ticket.
- **Seam 2: prop firm queries against real Postgres** (prior art: `ledger.test.ts`,
  `account-rules.test.ts`). Cases: order by firm then position; size filter OR across
  two sizes; sizes AND tags AND search; a program with null size never matches a size
  filter; size chips distinct and ascending; program select options in firm then
  position order. DB tests must execute, not skip.
- **Seam 3: the pure page-logic module** (prior art: Vitest suites under
  `src/lib/**/__tests__`). Cases: URL sizes parse/build round trip and invalid values
  dropped; grouping into firms keeps only matching programs; default by compare, by a
  single filtered size, by smallest size, by position when sizes are unknown.
- Full gate per `context/ai-interaction.md`, plus a browser click path: switch sizes on
  a card, expand it, filter by one and by two sizes, combine with a tag and a search,
  compare two sizes of one firm, reload and keep the view, open account settings and
  link a 100k program. Console free of new errors.

## Out of Scope

- Product lines other than each firm's existing one(s), such as Futures Elite's
  Prime/Instant/Custom.
- A "discontinued" marker for programs a firm no longer sells (later, own step).
- Linking an account to a firm without a program ("not listed").
- The rule detail table and the richer prop firm compare (stay in Future).
- Searchable combobox for the program select.
- Any change to account rules, rule status or ADR 0001.
- Deleting programs or firms from the database.

## Further Notes

- Slicing (`issues/`): 01 format/parser (format, position, account size, tag rule,
  move of existing data, ordering incl. program select), 02 Design.md, 03 firm cards
  with size control and compare, 04 size filter, then 05–07 data for five firms each,
  each reviewed by the user before seeding.
- Data tickets depend only on 01; the UI tickets can be built against the moved
  fifteen programs plus test fixtures. Agreed order: 01 → 02 → 03 → 04 → 05–07.
- Grilled 2026-10-21; glossary updated the same day (Prop firm program sharpened,
  Product line added).
