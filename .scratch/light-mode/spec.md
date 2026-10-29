# Spec: Light mode

Status: ready-for-agent

Decision: project overview → Decisions → Light mode; ADR 0007 (theme per device).
Design: Design.md §1 (principle 6), §2 Tokens, §3.1 Shell (Theme), §5 Accessibility.

## Problem Statement

The journal is dark only. In a bright room or by day a dark interface is harder to read,
and some traders simply prefer a light one. There is no way to switch, and the dark
theme itself misses WCAG AA on field borders (1.39:1 against a card).

## Solution

A second palette, Light, beside the existing Dark. The trader picks Dark, Light or
System (follows the operating system) from a menu in the sidebar footer or from the
command palette. Dark stays the default. The pick is remembered on the device and applies
to every page, the signed-out ones included, from the first paint. Layout, motion and
every design rule stay the same in both themes; only colour values differ, and both
themes meet WCAG 2.2 AA.

## User Stories

1. As a trader, I want to switch to a light theme, so that the journal is readable in a bright room.
2. As a trader, I want to switch back to the dark theme, so that I can use it in the evening.
3. As a trader, I want a System option, so that the journal follows my operating system's light or dark setting.
4. As a trader on System, I want the journal to follow when my operating system switches between light and dark, so that I do not have to touch the setting.
5. As a trader, I want Dark to stay the default, so that nothing changes until I choose.
6. As a trader, I want the switch one click away in the sidebar footer, so that I can change it without opening Settings.
7. As a trader with a collapsed sidebar, I want the switch in the icon rail with a tooltip, so that it stays reachable.
8. As a trader on a phone, I want the switch in the drawer, so that I can change it below the desktop width.
9. As a trader, I want the switch's icon to show my current pick, so that I know which theme is active, including System.
10. As a trader, I want the menu to mark the current pick, so that I do not pick it again by mistake.
11. As a trader, I want the theme in the command palette, so that I can change it from the keyboard.
12. As a trader, I want to find the theme actions by typing "light", "dark", "system" or "theme", so that I do not have to scroll.
13. As a trader, I want the theme to change at once, without a fade, so that the switch feels direct.
14. As a trader, I want my pick remembered on this device, so that it survives a reload, a new session and signing out.
15. As a trader with several devices, I want each device to keep its own pick, so that my laptop can be light while my desktop stays dark.
16. As a visitor of the demo account, I want my theme to stay mine, so that another visitor cannot change it for me.
17. As a trader, I want the front page, sign-in and registration in my theme, so that the screen does not jump between themes when I sign in or out.
18. As a trader, I want the page to load in my theme straight away, so that there is no flash of the other theme.
19. As a trader on a practice account, I want the amber stripe, marker and fog in both themes, so that I always see that I am on practice.
20. As a trader, I want profit and loss in the same calm sign colours in both themes, so that the light theme rewards nothing the dark one does not.
21. As a trader, I want process metrics in the one process colour in both themes, so that streak, score and badges stay recognisable.
22. As a trader, I want the streak orb drawn in the active theme's colour, so that it does not stay in the old colour after a switch.
23. As a trader, I want the equity curve, calendar tints and analytics charts legible in both themes, so that I can read my numbers either way.
24. As a trader, I want the econ calendar's impact colours distinguishable in both themes, so that I can tell low, medium and high apart.
25. As a trader, I want sheets, menus, toasts and the command palette in the active theme, so that no overlay stays dark in Light.
26. As a trader, I want form fields with clearly visible borders in both themes, so that I can see where to type.
27. As a trader, I want the focus ring clearly visible in both themes, so that keyboard navigation works.
28. As a trader with weaker eyes, I want both themes to meet WCAG AA contrast, so that text and controls stay legible.
29. As a trader, I want native browser controls (scrollbars, date pickers, select lists) to match the theme, so that nothing white flashes inside Dark or dark inside Light.
30. As a trader who reduced motion, I want the switch to behave exactly the same, so that nothing animates either way.

## Implementation Decisions

- **Palette Light is prototype palette B "Warm paper"** (prototype branch
  `chore/prototype-light-palette`, chosen 2026-10-29). Values, from the prototype:

  | Token | Light |
  |---|---|
  | `background` | `oklch(0.97 0.008 85)` |
  | `foreground`, `card-foreground`, `popover-foreground`, `secondary-foreground`, `accent-foreground`, `sidebar-accent-foreground` | `oklch(0.22 0.01 60)` |
  | `card` | `oklch(0.99 0.004 85)` |
  | `popover` | `oklch(0.995 0.003 85)` |
  | `primary` | `oklch(0.24 0.01 60)` |
  | `primary-foreground` | `oklch(0.98 0.004 85)` |
  | `secondary` | `oklch(0.935 0.01 85)` |
  | `muted` | `oklch(0.94 0.01 85)` |
  | `muted-foreground` | `oklch(0.47 0.015 70)` |
  | `accent` | `oklch(0.93 0.012 85)` |
  | `destructive`, `negative` | `oklch(0.52 0.18 28)` |
  | `border` | `oklch(0.2 0.02 60 / 10%)` |
  | `input` | `oklch(0.2 0.02 60 / 47%)` |
  | `ring`, `sidebar-ring`, `sidebar-primary`, `process` | `oklch(0.5 0.16 265)` |
  | `sidebar` | `oklch(0.945 0.01 85)` |
  | `sidebar-foreground` | `oklch(0.27 0.01 60)` |
  | `sidebar-primary-foreground` | `oklch(0.99 0 0)` |
  | `sidebar-accent` | `oklch(0.91 0.012 85)` |
  | `sidebar-border` | `oklch(0.2 0.02 60 / 9%)` |
  | `positive` | `oklch(0.49 0.11 160)` |
  | `practice` | `oklch(0.64 0.15 65)` |
  | `practice-foreground` | `oklch(0.5 0.11 65)` |
  | `impact-low` / `-medium` / `-high` | `oklch(0.62 0.13 85)` / `oklch(0.6 0.17 50)` / `oklch(0.55 0.2 27)` |
  | `practice-fog` | `inset 0 0 140px oklch(0.75 0.16 70 / 0.22), inset 0 0 36px oklch(0.75 0.16 70 / 0.2)` |
  | `day-lift` | `0 10px 28px -8px oklch(0.3 0.03 60 / 0.2), 0 0 0 1px var(--input)` |

  The Light theme declares `color-scheme: light`, Dark keeps `color-scheme: dark`.
- **Tokens per theme:** every colour role has the same name in both themes; only the
  values differ. Econ impact colours, practice fog and day lift move from a single
  global value to one value per theme.
- **Practice tokens:** `practice` (stripe, marker, fog colour; Dark value = today's
  `amber-400`) and `practice-foreground` (amber text; Dark value = today's `amber-300`)
  replace every fixed amber palette class in components. The rule-status "calm warning"
  amber uses the same tokens.
- **Dark fix for AA:** Dark `input` rises from 12 % to 34 % white (3.10:1 on `card`).
  Fills derived from `input` (field backgrounds, unchecked switches) change with it and
  are checked by eye; if a fill turns too strong, it gets its own token rather than
  keeping the border below AA.
- **Theme module (new, pure, no framework imports):** the single place that knows the
  theme vocabulary. Interface: the list of picks (`dark`, `light`, `system`); parsing an
  untrusted cookie value into a pick (missing or unknown → `dark`); the body class for a
  pick. Used by the root layout, the server action and both switch UIs.
- **Theme state:** a cookie `theme` holding the pick. One year, `SameSite=Lax`, path `/`.
  No database column, no migration (ADR 0007).
- **Server action "set theme":** parses its input with the theme module, refuses
  anything that is not a pick, sets the cookie. It needs no session: the theme belongs
  to the device, and the signed-out pages have no switch anyway.
- **Rendering:** the root layout reads the cookie and puts the theme class on `<body>`,
  where overlays portal to. `system` applies the Light values inside a
  `prefers-color-scheme: light` media query and Dark otherwise. The `dark` custom variant
  matches the Dark class and System under a dark preference, so the shadcn `dark:`
  variants follow. Reading cookies in the root layout opts every route into dynamic
  rendering (Next.js `cookies` docs); the app pages already are, the front page, sign-in
  and registration become so.
- **Client switch:** picking a theme sets the body class on the client at once, then
  calls the server action; the server's re-render agrees with it. No transition.
- **Streak orb:** it reads the process colour when it draws, so it redraws when the
  body's theme class changes or, on System, when the colour-scheme preference changes.
- **Sidebar menu:** icon button in the footer beside "Sign out" in the expanded sidebar,
  the collapsed rail (tooltip like the other rail items) and the mobile drawer. The menu
  is a radio group (Dark, Light, System) with the current pick checked; icons moon, sun,
  monitor. Keyboard operable; focus returns to the button on close. Shell shortcuts are
  unchanged.
- **Command palette:** a group "Theme" with the three picks; choosing one switches like
  the menu and closes the palette; the current pick is marked; keywords "light",
  "dark", "system", "theme".
- **Docs already updated on this branch:** Design.md (principle 6, tokens, shell, AA
  rule), coding standards (Themes), project overview (Decisions → Light mode, Not
  Building and Future cleaned up), project structure. AGENTS.md's UI invariant still
  says "dark only"; its wording changes with approval.

## Testing Decisions

- A good test asserts behaviour through a public seam: what a cookie value turns into,
  what the source may and may not contain. It does not assert class plumbing inside
  components or the menu's markup.
- **Seam 1 — theme module (pure, Vitest):** every pick parses to itself; missing,
  empty, differently cased and unknown values parse to `dark`; each pick maps to its body
  class. Prior art: the pure helpers tested under the shell and settings lib tests.
- **Seam 2 — the existing redesign guard (source scan, Vitest):** extended with
  - no fixed amber palette class in components or app files;
  - the body-class case follows the theme module instead of a hard-coded `dark`;
  - a contrast case that reads both themes' token values from the global stylesheet and
    asserts WCAG ratios: text roles 4.5:1 against their surfaces; `input`, `ring` and
    `practice` 3:1. A later token edit cannot drop below AA silently.
  Prior art: the redesign guard's raw-colour case and the reduced-motion guard.
- **No unit test** for the server action (the project has no action tests; its input
  check is the theme module), the menu, the command palette, the orb redraw or System
  following the OS. These are covered by the browser click path.
- **Browser click path, both themes:** dashboard, journal, a sheet, trade form,
  analytics, econ calendar, Prop Firm Rules, ledger, settings, sign-in; practice account
  selected; switch via sidebar (expanded, rail, drawer) and command palette; reload and
  sign-out keep the pick; System with emulated light and dark preference; a second
  browser keeps its own pick; no new console errors.
- Full gate from the workflow doc before commit approval.

## Out of Scope

- Storing the theme on the user or syncing it across devices (ADR 0007).
- A theme section in Settings.
- Further themes, a high-contrast mode or custom accent colours.
- Any change to layout, motion or the money and process colour rules.
- The landing page (Future, own document).

## Further Notes

- Contrast of the prototype palettes was computed with a scratch script; all Light
  values above pass AA. The other candidates (A "Cool paper", C "Soft gray") also passed
  and stay on the prototype branch.
- Tickets: `issues/01` palette and cookie (no switch yet), `issues/02` sidebar menu,
  `issues/03` command palette.
