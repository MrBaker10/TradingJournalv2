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

**Status:** ready-for-agent

- [ ] Parser reads several `###` programs per firm in file order, with positions 1..n; firm website and "Last verified" read at firm level.
- [ ] Parse errors with line number: firm without a program, program heading before any firm, duplicate program name within a firm, firm field inside a program block. All existing strictness rules still hold.
- [ ] Account size parses only from `$NN,NNN` (`$50,000` → 50000, `$150,000` → 150000); a missing value is null; `50k`, `$50,000 (EOD)`, `$50.000` fail the seed.
- [ ] A summary tag containing `$` or a size token (`50k`, `100K`) fails the seed.
- [ ] Generated migration adds the position and the numeric account size to programs; no `drizzle-kit push`.
- [ ] Seeder upserts on firm plus name and writes position and account size; still inserts and updates only.
- [ ] The fifteen programs moved to the new format, names unchanged; size-bound tags ("50k EOD", "$3,000 target", "$2,700") rewritten size-neutral or dropped; no other content change.
- [ ] Page, compare lookup and program select order by firm name, then position.
- [ ] Entry in `context/decisions.md`: account size is the one field read as a number, and why (wording approved by the user).
- [ ] Parser tests (Seam 1), including the suite against the real file; DB query test for the ordering (Seam 2), executed, not skipped.
- [ ] Gates from `context/ai-interaction.md`; re-seed run locally per `context/operations.md`.
- [ ] Browser: Prop Firm Rules page shows the fifteen programs, chip bar without amounts; an existing linked account still shows its program and rule status; no new console errors.

## Review
