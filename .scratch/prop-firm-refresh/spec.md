# Spec: Prop firm data refresh

Status: done

Origin: question of 2026-10-28 whether prop firm rules could prefill linked accounts; it
turned into how the prop firm data stays correct at all. Decision: `docs/adr/0005`.
Terms: `GLOSSARY.md` (Prop firm program, Discontinued program, Program rename, Source
list, Data refresh, Linked account, Account rules).

## Problem Statement

The prop firm catalogue was researched once (every firm "Last verified 2026-10-22") from
the firms' own pages, and nothing keeps it current. Four gaps let the app drift from what
the firms actually sell:

- No re-check: firms change rules and sizes, and nothing tells the user which firm's
  pages changed. The sources exist only scattered across three research notes in
  `.scratch/prop-firm-sizes/`.
- Seeding is separate from deploying: a pushed `PropFirmsData.md` does not reach the
  production database until someone runs the seeder there, and nothing shows whether
  that happened.
- The seeder never deletes, so a program a firm stopped selling stays in the catalogue
  forever; a linked program cannot be deleted anyway.
- A renamed program comes back as a second row unless it is renamed by hand first.

The upkeep must work without any AI subscription (ADR 0005, global working rules).

## Solution

A monthly data refresh the user runs by hand, documented in `context/operations.md` and
built from plain scripts: a source list per firm in the repo, a script that reports which
source pages changed since the last refresh, a curated update of `PropFirmsData.md`, the
existing seeder (now marking discontinued programs), and a read-only script that proves
a database matches the file. A program missing from the file becomes a discontinued
program: hidden in the catalogue, still linkable and marked as no longer sold, with a
note on a linked account.

## User Stories

1. As a prop trader, I want the catalogue to show only programs the firms still sell, so that I don't compare against something I can't buy.
2. As a prop trader, I want to link an account to a program that was discontinued after I bought it, so that every account I own can carry its rules.
3. As a prop trader, I want a linked account whose program is no longer sold to say so, so that I know its program text is frozen at the last refresh.
4. As a prop trader, I want my linked account's rules and rule status unchanged when its program is discontinued, so that the rules I bought under keep applying.
5. As a prop trader, I want a firm the app knows to disappear from the catalogue once it sells nothing, so that the catalogue lists only firms I can buy from.
6. As a prop trader, I want a program the firm sells again to return to the catalogue, so that a temporary pause does not hide it for good.
7. As the curator, I want each firm's official source pages in one file in the repo, so that every refresh checks the same pages.
8. As the curator, I want one command that tells me which firms' source pages changed since the last refresh, so that I read only what changed.
9. As the curator, I want the last seen text of every source committed, so that I see what changed in a diff and both machines share one state.
10. As the curator, I want a source that cannot be fetched reported as such, so that a dead link is not mistaken for "unchanged".
11. As the curator, I want a renamed program renamed in place before seeding, so that accounts linked to it keep their link.
12. As the curator, I want one read-only command that compares a database with `PropFirmsData.md` and fails on any difference, so that I know production really matches after seeding.
13. As the curator, I want the whole refresh written down step by step in the operations guide, so that I can run it without an AI tool.
14. As the maintainer, I want the refresh to need no new hosted infrastructure, so that nothing runs or breaks while nobody looks.

## Implementation Decisions

- **Discontinued program in the schema.** `prop_firm_programs.discontinued_at`
  (timestamptz, nullable) via a generated migration; null means on sale. A firm has no
  flag of its own: it leaves the catalogue when none of its programs is on sale.
- **The seeder marks and unmarks.** After upserting the file's firms and programs, every
  program in the database that is not in the file (including every program of a firm
  missing from the file) gets `discontinued_at = now()` if it is still null; every
  program in the file gets null. The decision which rows to mark is a pure function over
  the parsed file and the existing rows, so it can be tested without a database. Still
  no deletes.
- **Renames stay a manual step before seeding**, as `context/operations.md` already
  describes; the refresh guide makes it an explicit step, and the compare script lists
  programs that would be marked discontinued so a forgotten rename shows up before
  production.
- **Catalogue.** `listPropFirms`, `listSummaryTags` and `listAccountSizes` see programs
  on sale only.
- **Link select.** `listProgramOptions` keeps discontinued programs and says which they
  are; the select labels them "no longer sold". The rule reference text stays as last
  seeded.
- **Linked account note.** Account settings show "no longer sold" next to the linked
  program's name. Rule status, warnings and every figure are unchanged (ADR 0001).
- **Source list.** `context/prop-firm-sources.md`: one `## <Firm name>` heading per firm,
  firm names exactly as in `PropFirmsData.md`, one official URL per line. First filled
  from the three research notes in `.scratch/prop-firm-sizes/`. Official pages only,
  as the prop-firm-sizes spec decided.
- **Change detection script.** A `pnpm` script fetches every source, extracts the
  readable text, and compares it with the committed snapshot of that source. Output per
  firm: changed, unchanged, failed (with the HTTP status or error). It writes the new
  snapshots so the diff shows the change; it never touches `PropFirmsData.md` or a
  database. Snapshots live in the repo next to the source list. Text extraction is
  settled by a short spike against the real sources first; a new dependency for it needs
  the user's OK.
- **Compare script.** A read-only `pnpm` script parses `PropFirmsData.md` with the
  existing parser and compares it with the database the env file points at: firms,
  programs, every program field, "Last verified" and website, and which programs are or
  would be discontinued. Non-zero exit on any difference. Run against production with
  the env file pattern of `context/operations.md`; production stays run by Sascha.
- **Refresh guide.** A section in `context/operations.md` with the monthly steps: run
  detection, read changed pages, update `PropFirmsData.md` and "Last verified", note
  renames, rename in place, seed local, check `/prop-firms`, seed and compare Neon
  preview, merge, seed and compare production. The new migration follows the existing
  rule: both Neon branches before `main` is pushed.

## Testing Decisions

- Good tests check observable results through module interfaces: which programs a seed
  marks, what a comparison reports, which sources a detection run reports as changed.
  No test fetches the network.
- **Pure functions with Vitest:** the discontinued decision (seeder), the text
  extraction and snapshot comparison (detection), and the file-vs-database comparison
  over plain data (compare script).
- **Database tests** (real Postgres, rolled back, prior art in
  `src/db/queries/__tests__/prop-firms.test.ts`): the catalogue queries hide
  discontinued programs and firms with nothing on sale; `listProgramOptions` keeps and
  flags them.
- Existing prop firm parser and query tests stay unchanged and passing.
- Browser: catalogue without a discontinued program, the link select with one marked,
  and a linked account showing the note.

## Out of Scope

- Prefilling account rules or the starting balance from a program (separate question;
  ADR 0001 stands).
- Any scheduled or hosted automation (GitHub Actions, Vercel cron, AI routines).
- Commission data for prop firms.
- Deleting programs or firms.
- Re-researching the firms now; the first refresh happens after this spec ships.

## Further Notes

- The phase 1 decisions of 2026-10-28: detection run by hand monthly; discontinued
  programs marked, linkable and noted on a linked account; renames decided during the
  refresh; a read-only compare script as proof.
- `context/project-overview.md` describes the prop firm catalogue; if its wording needs
  to mention discontinued programs, the wording is proposed to the user first.
