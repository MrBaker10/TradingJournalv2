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

**Status:** ready-for-agent

- [ ] A program records whether and since when it is discontinued; the change ships as a generated migration.
- [ ] Which programs a seed marks or puts back on sale is decided by a pure function over the parsed file and the existing programs, covered by Vitest: a program missing from the file, every program of a firm missing from the file, a program back in the file, and an unchanged file.
- [ ] Seeding marks and puts back on sale as decided, and still deletes nothing.
- [ ] Database tests: the catalogue queries leave out discontinued programs, and a firm whose programs are all discontinued; tags and sizes of discontinued programs no longer appear.
- [ ] Existing prop firm parser and query tests unchanged and passing (none skipped).
- [ ] Full gate; browser check of the prop firm catalogue after locally removing a program from the file and seeding (it is gone), and after restoring it and seeding again (it is back).
