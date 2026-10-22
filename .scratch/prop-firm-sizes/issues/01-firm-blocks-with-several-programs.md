# 01: Firm blocks with several programs

**What to build:** `context/PropFirmsData.md` can hold several programs per prop firm.
A firm block opens with `## <Firm>` and carries the firm fields once; each program
follows under `### <Program name>` with its summary tags and the eighteen rule fields.
Seeding stores each program's position within its firm and its account size as a
number, read strictly from the `Account size` field, and refuses summary tags that
carry an amount or a size. The fifteen existing programs move into the new format with
their names unchanged, so re-seeding updates them in place and every linked account
keeps its program and its account rules. The Prop Firm Rules page, the compare lookup
and the program select in account settings list programs by firm, then position. The
chip bar no longer shows size-bound tags.

Spec: `.scratch/prop-firm-sizes/spec.md`. Terms: `GLOSSARY.md`. Decisions:
`docs/adr/0001-user-entered-account-rules.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Parser reads several `###` programs per firm in file order, with positions 1..n; firm website and "Last verified" read at firm level.
- [x] Parse errors with line number: firm without a program, program heading before any firm, duplicate program name within a firm, firm field inside a program block, program heading without a rule table. All existing strictness rules still hold.
- [x] Account size parses only from `$NN,NNN` (`$50,000` → 50000, `$150,000` → 150000); a missing value is null; `50k`, `$50,000 (EOD)`, `$50.000`, `$050,000` fail the seed.
- [x] A summary tag containing `$` or a size token (`50k`, `100K`) fails the seed.
- [x] Generated migration adds the position and the numeric account size to programs; no `drizzle-kit push`.
- [x] Seeder upserts on firm plus name and writes position and account size; still inserts and updates only.
- [x] The fifteen programs moved to the new format, names unchanged; size-bound tags (the fifteen "$X target" tags) dropped; no other content change.
- [x] Page and program select order by firm name, then position; the compare lookup keeps the order of the selection.
- [x] Entry in `context/decisions.md`: account size is the one field read as a number, and why (wording approved by the user).
- [x] Parser tests (Seam 1), including the suite against the real file; DB query test for the ordering (Seam 2), executed, not skipped.
- [x] Gates from `context/ai-interaction.md`; re-seed run locally per `context/operations.md`.
- [x] Browser: Prop Firm Rules page shows the fifteen programs, chip bar without amounts; an existing linked account still shows its program and rule status; no new console errors.

## Review

Two-axis review (standards, spec) after the first commit; fixed by amend unless noted.

- Spec: an empty `### ` program block was accepted and seeded every field as unknown → now a parse error ("has no rule table"), test first.
- Spec: Seam 2 covered one firm only, so ordering by firm name was untested → second firm that sorts first but is inserted last.
- Spec: account size regex accepted a leading zero (`$050,000`) → rejected, test case added.
- Spec: ticket and spec asked the compare lookup to order by firm and position → left in pick order (the page orders columns by selection); ticket and spec wording corrected. Spec also listed "50k EOD" as a tag; it is a program name and stays.
- Spec: the real-file test requires an account size for every program although the parser allows unknown → kept on purpose as a curation rule for tickets 05–07, commented in the test.
- Standards: the label/value loop existed twice (firm, program) with mirrored error branches; `parseProgram` ran ~90 lines; firm-field return type repeated `ParsedFirm` → shared `readLabelPairs`, `readSummaryTags` split out, `Pick<ParsedFirm, …>`.
- Standards: seeder repeated the column group in `values` and `set` → built once.
- Standards: `where` renamed `location`; a parser comment pointing at the data tickets reworded; a stale `parseBlock` reference fixed.
- Standards: `position` keeps `DEFAULT 1` permanently → left open on purpose: only the seeder inserts programs and always sets it; dropping the default would mean hand-editing a generated migration (`context/decisions.md`).
- Standards: `inRollback`/`dbReachable` helpers copied across seven DB test files → left open, outside this ticket.
