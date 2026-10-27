# Redesign replaces Design v1

The visual language of `context/Design.md` (Vision UI, neon and glow, navy/azure,
dense tiles) is replaced by a complete redesign: calm and precise at rest, responsive
on every interaction, modelled on the Stripe Dashboard rather than a marketing site.
The old document is archived as `context/Design-v1.md`; a shorter `context/Design.md`
takes over its path once a prototype has settled the direction. The mission
("reward consistent journaling, never profit"), the feature set, "Not Building" and
dark-only mode stay unchanged. Rewriting the old document section by section was
rejected because nearly every section encoded the visual language being dropped.

## Rules that replace "neon marks process, money does not glow"

- Feedback confirms the action (saved, deleted, imported), never the outcome: it looks
  the same for a winning and a losing trade.
- Expressive animation is reserved for process moments and stays proportional; every
  other interaction gets micro-feedback only. Money metrics are shown, never rewarded.
- A selected practice account stays permanently marked; its form is open.
- Reduced motion, tabular figures, empty states that explain the rules and responsive
  web remain mandatory. Interaction feedback appears within 100 ms, no animation blocks
  input, and heavy libraries load only on the pages that need them.

## Stack consequences

- shadcn/ui on Base UI replaces the hand-built primitives; Radix and keeping own
  primitives were considered. Base UI is the shadcn default since 2026-07 and removes
  hand-written accessibility code for overlays.
- `motion` stays the primary animation library because it honours
  `<MotionConfig reducedMotion="user">` centrally. GSAP is added only where the
  prototype shows an effect `motion` cannot produce, and Three.js only for process
  moments, lazy-loaded with a static fallback. Both are evaluated on the prototype
  branch before entering the stack.
- Evaluated on the prototype branches (2026-10-26/27): `motion` covers every page
  interaction; Three.js stays on the streak orb only; GSAP enters the stack but is
  reserved for the landing page and billing, where a timeline-driven effect is wanted.
  The dashboard and every app page use `motion`.

## Consequences

The redesign runs on a single `feature/redesign` branch with a feature freeze until it
merges, so main never mixes both designs. Seven prototype branches
(`prototype/redesign-dashboard` … `prototype/redesign-prop-firms`, each on top of the
previous) are the primary source: their commit bodies hold the verdicts, and the spec
under `.scratch/redesign/` derives from them. The prototypes are rewritten, never
copied. Code comments citing "Design §…" point at v1 until the ticket touching that file
updates them. A landing page and billing follow as separate efforts after the merge;
billing still requires a monetization decision.
