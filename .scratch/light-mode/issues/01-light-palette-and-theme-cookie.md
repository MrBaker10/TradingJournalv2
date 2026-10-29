# 01: Light palette and the theme cookie

**What to build:** The app renders in the theme stored in the `theme` cookie: Dark
(default, also for a missing or unknown value), Light or System. Every page, signed-out
ones included, loads in that theme without a flash. Light uses the values in the spec;
practice stripe, marker, fog and amber text, the econ impact colours and the calendar
day lift follow the theme. Dark's field border is raised to AA. No switch yet: the
cookie is set by hand in the browser for this ticket.

Spec: `.scratch/light-mode/spec.md`. Design: `context/Design.md` §1 (6), §2, §5.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Light values from the spec in `globals.css`; the Light theme sets `color-scheme: light`.
- [ ] Tokens `practice` and `practice-foreground` in both themes; every fixed `amber-*` class in components replaced by them.
- [ ] `impact-*`, `practice-fog` and `day-lift` have a value per theme.
- [ ] Dark `input` raised to `oklch(1 0 0 / 34%)`; dark fields checked by eye (fills derived from `input`).
- [ ] Pure theme module: picks, cookie value → pick (missing or unknown → `dark`), pick → body class; Vitest.
- [ ] Root layout reads the cookie through the theme module and sets the theme class on `<body>`; `system` follows `prefers-color-scheme`, `dark:` variants included.
- [ ] Streak orb redraws on a theme change and on a system preference change.
- [ ] Guard: no fixed `amber-*` class in `src/components` or `src/app`; the body-class case follows the new mechanism.
- [ ] Redesign guard: contrast case over both themes' token values (text 4.5:1; `input`, `ring`, `practice` 3:1).
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, cookie set by hand to each value: dashboard, journal, a sheet, trade form, analytics, econ calendar, Prop Firm Rules, settings, sign-in; practice account selected; System with emulated light and dark preference; no new console errors.
