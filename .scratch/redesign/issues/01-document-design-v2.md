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

**Status:** ready-for-agent

- [ ] The old design document is archived as v1 under its new name; links that point at it still resolve.
- [ ] The new design document is short and states, for each pattern in the spec, the shape, the states, the motion and the reduced-motion fallback, so that a page ticket can be built from it without reading a prototype branch.
- [ ] Tokens are listed by name with their role (the shadcn set plus `positive`, `negative`, `process`, the practice fog) without introducing values that differ from the prototype branch.
- [ ] Motion section names the budgets: interaction feedback within 100 ms taking 150 ms, sheet 600 ms in and 300 ms out, expressive animation only at process moments.
- [ ] Anti-patterns name what is gone: glow, gradients, card around everything, feedback that repeats the result, rewards for money.
- [ ] Agent guide, project overview and coding standards no longer describe the old visual language; the product invariants stay as they are.
- [ ] ADR 0004 carries the two notes from the spec's Further Notes.
- [ ] Code comments that cite the old document by section are left alone; the ticket that touches such a file updates them.
- [ ] Gate for documentation-only changes as defined in the workflow document; no code change in this ticket.

## Do not build

- Any component, token in CSS or dependency; those start in ticket 02.
- Rewriting the old document section by section; it is archived whole.
- Changes to product rules or "Not Building".
