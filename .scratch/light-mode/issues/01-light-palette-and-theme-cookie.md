# 01: Light palette and the theme cookie

**What to build:** The app renders in the theme stored in the `theme` cookie: Dark
(default, also for a missing or unknown value), Light or System. Every page, signed-out
ones included, loads in that theme without a flash. Light uses the values in the spec;
practice stripe, marker, fog and amber text, the econ impact colours and the calendar
day lift follow the theme. Dark's field border is raised to AA. No switch yet: the
cookie is set by hand in the browser for this ticket.

Spec: `.scratch/light-mode/spec.md`. Design: `context/Design.md` §1 (6), §2, §5.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Light values from the spec in `globals.css`; the Light theme sets `color-scheme: light`.
- [x] Tokens `practice` and `practice-foreground` in both themes; every fixed `amber-*` class in components replaced by them.
- [x] `impact-*`, `practice-fog` and `day-lift` have a value per theme.
- [x] Dark `input` raised to `oklch(1 0 0 / 34%)`; dark fields checked by eye (fills derived from `input`).
- [x] Pure theme module: picks, cookie value → pick (missing or unknown → `dark`), pick → body class; Vitest.
- [x] Root layout reads the cookie through the theme module and sets the theme class on `<body>`; `system` follows `prefers-color-scheme`, `dark:` variants included.
- [x] Streak orb redraws on a theme change and on a system preference change.
- [x] Guard: no fixed `amber-*` class in `src/components` or `src/app`; the body-class case follows the new mechanism.
- [x] Redesign guard: contrast case over both themes' token values (text 4.5:1; `input`, `ring`, `practice` 3:1).
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, cookie set by hand to each value: dashboard, journal, a sheet, trade form, analytics, econ calendar, Prop Firm Rules, settings, sign-in; practice account selected; System with emulated light and dark preference; no new console errors.

## Review

- Spec: `--radius` sat only in the Dark block, so it was undefined under `light`
  (rounded corners in `input-group`). Moved to `:root`; a guard case now asserts both
  themes define the same tokens.
- Spec: contrast case extended with the sidebar text pairs (`practice-foreground`,
  `muted-foreground` on `sidebar`; `sidebar-foreground` on `sidebar-accent`).
- Decided: the account avatar's initial (`sidebar-primary-foreground` on
  `sidebar-primary`, Dark 3.51:1; practice tint in Light 4.29:1) is decoration and
  not in the contrast case. `practice` on `sidebar` is not checked: no stripe is
  drawn there.
- Beyond the list: the native selects in settings and the trade form took the
  shadcn input's `dark:bg-input/30`; with a plain `bg-input/30` they showed a grey
  fill in Light. The streak orb does not replay the gathering on a theme redraw.
- Standards: orb counter renamed `themeVersion`; the gathering flag is set only when
  it played; guard helpers deduplicated and fail loudly on a missing theme block.
- Left as is: `themeBodyClass` returns the pick (the spec names it as the module's
  interface); duplicated select class and practice stripe spellings predate this
  ticket; `useThemeChange` reacts to any body class change (nothing else sets one).
