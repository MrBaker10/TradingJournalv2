# 03: Compare a database with the prop firm data file

**What to build:** One read-only command proves that a database matches the prop firm data
file: firms with their website and "Last verified", programs with every field, and which
programs are discontinued. It also lists programs the next seed would mark as discontinued,
so a forgotten program rename shows up before production is seeded. Any difference ends
the command with a non-zero exit code; it never writes to the database.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Prop firm program, Discontinued program, Program rename, Data refresh.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The comparison is a pure function over the parsed file and the rows read from the database, covered by Vitest: a match, a changed field, a missing program, an extra program, a program that would be marked discontinued, a discontinued program back in the file.
- [ ] The command reads the database the env file points at, using the existing env file pattern for Neon, and only reads.
- [ ] The output names each difference (firm, program, field) and the exit code is non-zero when there is one.
- [ ] Run locally: it reports a match right after seeding and a difference after an unseeded change to the file.
- [ ] Full gate; no browser check needed (no screen changes), stated as such.
