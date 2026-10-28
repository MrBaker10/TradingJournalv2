# 03: Compare a database with the prop firm data file

**What to build:** One read-only command proves that a database matches the prop firm data
file: firms with their website and "Last verified", programs with every field, and which
programs are discontinued. It also lists programs the next seed would mark as discontinued,
so a forgotten program rename shows up before production is seeded. Any difference ends
the command with a non-zero exit code; it never writes to the database.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Prop firm program, Discontinued program, Program rename, Data refresh.

**Blocked by:** 01

**Status:** done

- [x] The comparison is a pure function over the parsed file and the rows read from the database, covered by Vitest: a match, a changed field, a missing program, an extra program, a program that would be marked discontinued, a discontinued program back in the file.
- [x] The command reads the database the env file points at, using the existing env file pattern for Neon, and only reads.
- [x] The output names each difference (firm, program, field) and the exit code is non-zero when there is one.
- [x] Run locally: it reports a match right after seeding and a difference after an unseeded change to the file.
- [x] Full gate; no browser check needed (no screen changes), stated as such.

## Review

Standards:
- Fixed: `StoredFirm` and `StoredProgram` were hand-written; they now derive from the
  parser's `ParsedFirm` and `ParsedProgram` (coding-standards → TypeScript, no second
  shape). `StoredProgram` carries the real row id, so the index stand-in is gone.
- Fixed: `compareCatalogue` (about 90 lines) is split into `compareFirm`,
  `compareProgram` and `nextSeedChanges`; the script's `compare()` reads through its own
  `readCatalogue()` (Code quality, functions under 50 lines).
- Fixed: the test built `ProgramFields` with a cast that left keys undefined; it now sets
  every field, so `fieldIssue` takes `string | null` only.
- Left open (judgement call): the loop that copies the eighteen fields from a row in
  `compare-propfirms.ts` mirrors `emptyFields()` in `parse.ts`; sharing it would change
  `parse.ts`, outside this ticket.

Spec:
- Fixed: summary tags were compared as joined text, so `["EOD, No DLL"]` and
  `["EOD", "No DLL"]` matched; they are now compared one by one and shown as lists,
  with a test.
- Documented: a firm only the database has is no difference of its own (the seed never
  deletes); its programs still on sale are reported as the next seed would mark them.
- Kept: the host line and the "Match: …" summary, beyond the ticket, follow
  operations.md ("check the host first").
- Not run against Neon by the agent; the refresh guide (ticket 06) documents
  `node --env-file=.env.local --env-file=.env.neon.<branch> src/db/compare-propfirms.ts`.

Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (97 files, 1472 passed, none
skipped), `pnpm build` all pass. `pnpm db:compare:propfirms` locally: right after seeding
"Match: 15 firms, 61 programs on sale, 0 discontinued.", exit 0. Unseeded file edits
(removed "Select 300k (Daily Payout)", Futures Elite "Last verified" 2026-10-28, Elite
Challenge 25k profit target $9,999): one line per difference with both values, exit 1.
Seeded without the 300k, then restored the file unseeded: "Tradeify · Select 300k (Daily
Payout): discontinued in the database, back in the file", exit 1. Restored and seeded:
match. No browser check: no screen changes.
