# 01: Document Design v2

**What to build:** The written design that every later ticket builds against. The old
design document is archived as v1 and a short new one takes its path, written from the
seven prototype verdicts: principles, tokens, the patterns (shell, overview, dense list
and detail, dense table, form, process metrics and moments, reading and charts, many
sections with one entity, reference catalogue, sheet, feedback, mobile), motion,
accessibility and anti-patterns. The agent guide, the project overview and the coding
standards are updated where they still encode the old language (neon, glow, gradients,
card-around-everything, hand-built primitives). ADR 0004 gains its two notes: GSAP is
reserved for the landing page and billing, and the prototype branches are the primary
source for this spec. Markdown only, no code.

Spec: `.scratch/redesign/spec.md`. Terms: `GLOSSARY.md`. Sources: the verdicts in the
commit bodies of the `prototype/*` branches and the redesign handoff.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The old design document is archived as v1 under its new name; links that point at it still resolve.
- [x] The new design document is short and states, for each pattern in the spec, the shape, the states, the motion and the reduced-motion fallback, so that a page ticket can be built from it without reading a prototype branch.
- [x] Tokens are listed by name with their role (the shadcn set plus `positive`, `negative`, `process`, the practice fog) without introducing values that differ from the prototype branch.
- [x] Motion section names the budgets: interaction feedback within 100 ms taking 150 ms, sheet 600 ms in and 300 ms out, expressive animation only at process moments.
- [x] Anti-patterns name what is gone: glow, gradients, card around everything, feedback that repeats the result, rewards for money.
- [x] Agent guide, project overview and coding standards no longer describe the old visual language; the product invariants stay as they are.
- [x] ADR 0004 carries the two notes from the spec's Further Notes.
- [x] Code comments that cite the old document by section are left alone; the ticket that touches such a file updates them.
- [x] Gate for documentation-only changes as defined in the workflow document; no code change in this ticket.

## Do not build

- Any component, token in CSS or dependency; those start in ticket 02.
- Rewriting the old document section by section; it is archived whole.
- Changes to product rules or "Not Building".

## Review

Baseline: HEAD `1063598`. Two independent axes via the code-review skill.

- ADR 0004 already carried both notes from `8a976a5` (GSAP for landing page and
  billing; prototype branches as the primary source); no change needed.
- Spec: danger zone said `destructive`; the spec and the settings prototype use
  `negative`. Fixed.
- Spec: the fog had no token name; now `practice-fog`. Feedback and Mobile lacked
  motion and reduced-motion lines; added, with the saved state held about 1.5 s as on
  the settings prototype. Card hover and the calendar's 2 px lift are named in §4.
- Spec: journal search parameters, the weekly review summary and the auth card were
  missing; added (§3.3, §3.13).
- Spec/Standards: "the branch wins" contradicted Design.md being authoritative; now a
  difference is reported.
- Standards: "process values" is an avoided glossary term; now "process metrics".
- Standards: the Tailwind `translate`/`scale` rule, the library split and the `body`
  classes were stated twice; Design.md now points to coding standards for them.
- Standards: coding standards pointed a current rule at `Design-v1.md`; the price band
  reference no longer cites a document. The shadcn/Base UI rule now says the packages
  are planned until the shell-and-tokens ticket installs them.
- AGENTS.md UI invariant: only the old wording ("Process values may glow") is
  replaced; the practice stripe sentence keeps its meaning and gains the fog.
- Kept: technical lessons (key target check, dialog key events, SVG rounding) and the
  ranking threshold stay in the pattern text, because the spec states them per pattern
  and a page ticket builds from it.
- Gate: documentation only; `git diff --check` clean, paths and links checked.
