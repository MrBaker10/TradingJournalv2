# 01: Discontinued programs leave the catalogue

**What to build:** When a prop firm program is no longer in the prop firm data file, seeding
marks it as a discontinued program instead of leaving it on sale, and the catalogue stops
showing it: the firm list, the summary tag bar and the account size chips see programs on
sale only, and a firm with nothing on sale disappears. When the program is back in the
file, the next seed puts it on sale again. Nothing is deleted, and accounts linked to a
discontinued program keep their link.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Prop firm program, Discontinued program, Program rename.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A program records whether and since when it is discontinued; the change ships as a generated migration.
- [x] Which programs a seed marks or puts back on sale is decided by a pure function over the parsed file and the existing programs, covered by Vitest: a program missing from the file, every program of a firm missing from the file, a program back in the file, and an unchanged file.
- [x] Seeding marks and puts back on sale as decided, and still deletes nothing.
- [x] Database tests: the catalogue queries leave out discontinued programs, and a firm whose programs are all discontinued; tags and sizes of discontinued programs no longer appear.
- [x] Existing prop firm parser and query tests unchanged and passing (none skipped).
- [x] Full gate; browser check of the prop firm catalogue after locally removing a program from the file and seeding (it is gone), and after restoring it and seeding again (it is back).

## Review

Standards:
- Fixed: `seed()` in `src/db/seed-propfirms.ts` grew past 50 lines (coding-standards → Code
  quality); the marking moved into `markDiscontinued(firms)`.
- Left open (judgement calls): the two `update` blocks share a shape (only two, kept
  readable); `ExistingProgram` is a hand-written join projection, kept so `src/lib` does not
  import the schema; the test casts an empty `fields` object.
- Note: upserts and marking do not run in one transaction, as before; the next seed
  corrects a partial run.

Spec: nothing missing, no scope creep. `listSummaryTags` gained the `executor` parameter
its siblings have, for the rollback DB test. A program already discontinued keeps its
original `discontinued_at`.

Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (95 files, 1455 passed, none
skipped), `pnpm build` all pass. Seed with the unchanged file: 0 discontinued, 0 back on
sale. Browser: removed "Select 300k (Daily Payout)" from `context/PropFirmsData.md`,
seeded (1 discontinued), `/prop-firms?q=Tradeify&size=any` showed 4 programs without it;
restored the file, seeded (1 back on sale), the page showed 5 programs with it; no console
errors.
