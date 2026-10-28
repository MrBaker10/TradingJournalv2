# 06: Data refresh guide

**What to build:** The operations guide describes the monthly data refresh step by step, so
it can be run without any AI tool: run the change detection, read the changed pages, update
the prop firm data file and "Last verified", decide program renames and apply them in
place, seed locally and check the catalogue, seed and compare the Neon preview branch,
merge, then seed and compare production. Production stays run by Sascha.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Data refresh, Source list, Program rename, Discontinued program.

**Blocked by:** 02, 03, 05

**Status:** ready-for-agent

- [ ] The operations guide has a data refresh section with every step, the exact commands and when to stop (a failed source, a difference in the comparison, a pending rename).
- [ ] The existing rename and migration rules in the guide point to the data refresh instead of repeating it.
- [ ] Wording changes to the project overview, if any, are proposed to the user before the edit.
- [ ] The guide is walked through once end to end against the local database without changing the prop firm data, and the commands and results are recorded in this ticket.
- [ ] Documentation check per the workflow: accuracy against the scripts, paths and links, `git diff --check`.
