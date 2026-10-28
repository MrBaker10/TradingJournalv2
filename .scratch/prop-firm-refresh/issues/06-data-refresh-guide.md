# 06: Data refresh guide

**What to build:** The operations guide describes the monthly data refresh step by step, so
it can be run without any AI tool: run the change detection, read the changed pages, update
the prop firm data file and "Last verified", decide program renames and apply them in
place, seed locally and check the catalogue, seed and compare the Neon preview branch,
merge, then seed and compare production. Production stays run by Sascha.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Data refresh, Source list, Program rename, Discontinued program.

**Blocked by:** 02, 03, 05

**Status:** done

- [x] The operations guide has a data refresh section with every step, the exact commands and when to stop (a failed source, a difference in the comparison, a pending rename).
- [x] The existing rename and migration rules in the guide point to the data refresh instead of repeating it.
- [x] Wording changes to the project overview, if any, are proposed to the user before the edit.
- [x] The guide is walked through once end to end against the local database without changing the prop firm data, and the commands and results are recorded in this ticket.
- [x] Documentation check per the workflow: accuracy against the scripts, paths and links, `git diff --check`.

## Walkthrough (2026-10-28, local database, data file unchanged)

1. `pnpm check:prop-firm-sources`: 193 sources; every reachable one unchanged (125),
   68 failed with HTTP 403 (the always-failing pages the guide lists).
2. `git diff --stat context/prop-firm-snapshots/` and `git status`: no snapshot
   changed or added.
3. and 4. Skipped: nothing to change, no rename.
5. `pnpm test`: 98 files, 1482 passed. `git diff --check`: clean.
6. No rename to apply. `pnpm db:compare:propfirms` (host `localhost:5432`): "Match: 15
   firms, 61 programs on sale, 0 discontinued." `pnpm db:seed:propfirms`: "Seeded 15
   firms and 61 programs; 0 discontinued, 0 back on sale." Compare again: Match.
   `/prop-firms?size=any`: 61 programs, no console errors. Settings → "Lucid 25k Eval"
   → Program: 61 programs plus "Not linked", none labelled "no longer sold" (none is
   discontinued).
7. and 8. Not run: Neon preview and production are outside this ticket's local
   walkthrough; production is run by Sascha.

## Review

Standards:
- Fixed: "without any AI tool" overstated ADR 0005; the guide now says "without any AI
  subscription: AI may speed up reading the changed pages, never replace a step".
- Fixed: the list of always-failing pages missed `e8markets.com/futures` and called the
  Apex API URLs help pages; it now names all 68.
- Fixed: paths in step 1 carry `context/` like step 2.
- Fixed: "checking the host the script prints" applied to the seed too, which prints
  none; it now names the first compare run.
- Left as is (judgement call): the rename SQL appears as the 2026-10-22 record and as the
  step 6 template; preview and production repeat three command lines. Scripts per Neon
  branch would be new scripts, outside this ticket.

Spec:
- Fixed: "a failed source that had a saved text before" could not be read from the
  output; the stop is now "any failed source not in the always-failing list".
- Fixed: step 8 states the stops; step 5 says to commit again after any later change.
- Fixed: the shortened rename paragraph had lost what to do when a rename is found after
  a seed; step 6 now covers it (delete the unlinked new row, rename the old one, seed).
- Fixed: the walkthrough now records the Settings check of step 6.

Decisions (user, 2026-10-28): the branch `chore/prop-firm-refresh-<yyyy-mm>` is
documented in `context/ai-interaction.md` → Working loop; the project overview (H)
gained a paragraph on discontinued programs and the data refresh, as proposed.
