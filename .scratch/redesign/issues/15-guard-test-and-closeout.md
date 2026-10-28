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

**Status:** done

- [x] The guard test passes on the branch and fails when a hex or rgba literal is added to a component, when a `prototype/` directory or a `variant`/`view` parameter appears, when the motion config leaves the root or the theme class leaves `body`; each failure is shown once during implementation and recorded.
- [x] No hand-built primitive remains that the shadcn set replaced; no old token remains in the global theme or in a component.
- [x] No code comment cites the archived design document by section without pointing at v1 deliberately.
- [x] Every page passes a final pass at 390 px: 16 px gutter, no horizontal page scroll, sheets full width, tables scrolling inside their container.
- [x] The spec and every ticket carry `Status: done`; the prototype branches are untouched (deleting them is asked separately).
- [x] Gates: lint, typecheck, test, build. Browser: one walk through every page in the sidebar at desktop width and 390 px; no console errors and no hydration warning on a clean load.

## Do not build

- Deleting the prototype branches.
- Light mode, GSAP, component tests, E2E or visual regression tooling.

## Review

- Guard: `src/app/__tests__/redesign-guard.test.ts`, five checks. Each was shown red
  once with a probe and green on the tree. Raw colour: `"#ff0000"`,
  `"rgba(0, 0, 0, 0.5)"`, `"hsl(0 0% 50%)"`, `bg-[oklch(0.5_0.1_20)]` in
  `src/components/zz-guard-probe.tsx`; an "issue #1234" comment and a comment naming
  `oklch()` stay green. Prototype: an empty `src/components/dashboard/prototype/`.
  Parameter: `params.variant`, `searchParams.get("view")`, `"/journal?view=A"`,
  `const { view } = await p.searchParams`, `searchParams?.variant`, `q["view"]`,
  `sp.get("variant")`. Motion: `{children}` moved outside `<MotionConfig>`. Theme:
  `dark` moved from `<body>` to `<html>`; `className={cn("dark", …)}` stays green.
- Replaced: the Settings password, two-factor and delete rows use `AuthTextField` and
  `AuthSubmit` (which gained `success` and `fullWidth`); `AuthField`, `SubmitButton`
  and the unused `FIELD_CLASS` are deleted. A failed password change or account
  deletion other than a wrong password is a §3.11 toast; a wrong password stays at
  the field. `InlineMessage` (plan card, daily checklist) stays as the app's
  reserved-slot message line in v2 tokens; its "good plan" confirmation moved from
  green to `process`, since green belongs to money. Rule status lines read
  `foreground`, amber for close and `negative` for breached, as `RuleDot` does.
  Toasts are the `popover` surface with a `process` or `negative` icon, no glow.
- Tokens: the v1 `@theme` block and the `edge-neon`, `text-glow`, `cap`, `cap-neon`,
  `cap-practice` utilities are gone. The econ impact colours stay as v2 tokens with a
  row in Design.md §2 (decided by the user), and the `popover` role there now names
  toasts. `page-title` stays: the v2 pages use it.
- Comments: every `Design.md §4.<n>` now reads `Design-v1.md §4.<n>`, the detail it
  cites lives only there; v1-only §6 (micro-rewards) likewise. Reduced-motion
  citations of v1 §5 moved to v2 §4; the badge sweep cites v2 §6, which now states
  that exception. Remaining §1, §2, §3.x, §4 and §5 citations match v2.
- Changed after review on request: the practice switch is the shadcn `Switch`
  (`pnpm exec shadcn add switch`, no new dependency); the hand-built
  `toggle-switch.tsx` is deleted. Two changes on top of the generated code: the
  thumb's transition names `translate` (coding-standards.md → Motion), and at the call
  site "on" is the practice amber with a hit area 42 px high (Design.md §5). Browser
  at 1440 px and 390 px (reduced motion) in the new-account editor, nothing saved:
  click turns it on in amber with the card's amber edge, Space turns it off with focus
  kept, `aria-describedby` intact, no console errors.
- Left open: `InlineMessage` and the form blocks' `FieldError` are two
  message lines (reserved slot vs. inserted). The password row confirms with
  "Changed", not §3.11's "Saved". The guard does not check SVG presentation
  attributes or Tailwind palette classes; Testing Decisions does not ask for either.
- Gates: lint, typecheck, test (1444 passed, none skipped), build. Browser: every
  sidebar page at 1440 px and at 390 px with reduced motion, each on a clean load: no
  console error, no hydration warning, no horizontal scroll, the h1 16 px from the edge
  at 390, every table inside its scroll box, every detail sheet full width at 390.
  Settings at both widths: empty submits of password, two-factor and delete show
  errors at the field; a failed password change (request answered 500 in the browser)
  shows the error toast. Delete failure checked on a throwaway user registered for the
  run (request answered 500): toast, input kept, still on `/settings`; the user was
  then deleted through the auth API and a DB query on `users.created_at` finds none
  left. Nothing of the demo user was changed.
