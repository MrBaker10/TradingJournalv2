# 15: Guard test and close-out

**What to build:** The redesign is sealed. One static guard test, in the style of the
toast import guard and the reduced-motion guard, fails the build the moment a prototype
artefact or a raw colour comes back: no hex or rgba literal in a component, no
`prototype/` directory, no `variant` or `view` search parameter, the motion config at
the root, the theme class on `body`. The last hand-built primitives and the old neon,
glow, gradient and well tokens are removed with their last use. Code comments that still
cite the archived design document by section are updated or removed. The spec is set to
done once every ticket is done.

Spec: `.scratch/redesign/spec.md` → Testing Decisions, Stack and tokens. Design:
`context/Design.md`.

**Blocked by:** 03–14 (every page ticket)

**Status:** ready-for-agent

- [ ] The guard test passes on the branch and fails when a hex or rgba literal is added to a component, when a `prototype/` directory or a `variant`/`view` parameter appears, when the motion config leaves the root or the theme class leaves `body`; each failure is shown once during implementation and recorded.
- [ ] No hand-built primitive remains that the shadcn set replaced; no old token remains in the global theme or in a component.
- [ ] No code comment cites the archived design document by section without pointing at v1 deliberately.
- [ ] Every page passes a final pass at 390 px: 16 px gutter, no horizontal page scroll, sheets full width, tables scrolling inside their container.
- [ ] The spec and every ticket carry `Status: done`; the prototype branches are untouched (deleting them is asked separately).
- [ ] Gates: lint, typecheck, test, build. Browser: one walk through every page in the sidebar at desktop width and 390 px; no console errors and no hydration warning on a clean load.

## Do not build

- Deleting the prototype branches.
- Light mode, GSAP, component tests, E2E or visual regression tooling.
