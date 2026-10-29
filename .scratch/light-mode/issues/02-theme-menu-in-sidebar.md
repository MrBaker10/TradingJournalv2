# 02: Theme menu in the sidebar

**What to build:** An icon button in the sidebar footer beside "Sign out" opens a menu
with Dark, Light and System. The icon shows the current pick (moon, sun, monitor), the
menu marks it. Picking one switches at once, without a transition, and is remembered on
this device. The button is there in the expanded sidebar, the collapsed rail (with a
tooltip like the other rail items) and the mobile drawer.

Spec: `.scratch/light-mode/spec.md`. Design: `context/Design.md` §3.1 (Theme).

**Blocked by:** 01

**Status:** done

- [x] Server action sets the `theme` cookie (one year, `SameSite=Lax`, path `/`) for a valid pick and refuses anything else; tested.
- [x] Menu as a radio group with the current pick checked; keyboard operable; focus returns to the button on close.
- [x] The class on `<body>` changes on the client at once; the server response agrees with it.
- [x] Works for the demo account like any other user; a second browser keeps its own pick.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: switch through all three in the expanded sidebar, the rail and the drawer (below `lg`); reload keeps the pick; sign out and the sign-in page keeps it; no new console errors.

## Review

- Decided: the action is not unit-tested (spec, Testing Decisions); its input check
  is tested instead: `setThemeSchema` in `src/schemas/` (Zod, coding-standards →
  Data fetching and validation) and `THEME_COOKIE_OPTIONS` in the theme module.
- Decided: the action requires a session via `getCurrentUser()` (coding-standards →
  Visibility) although the spec says it needs none; the switch only exists behind
  sign-in, so nothing changes for the trader. The spec line is out of date.
- Beyond the list: the mobile drawer is a modal `<dialog>` in the top layer, so a
  menu portalled into `<body>` sat behind it and could not be clicked (reproduced);
  `DropdownMenuContent` takes an optional `container`, the drawer passes its dialog.
  A failed save restores the previous class (unless a later pick replaced it) and
  shows a toast.
- Standards: `RailTip`, `SIDEBAR_ITEM_CLASS` and the new `SIDEBAR_ICON_BUTTON_CLASS`
  moved to `sidebar-parts.tsx`, which breaks the import cycle between
  `sidebar-content` and `theme-menu` and shares the footer button class.
- Left as is: `(app)/layout.tsx` reads the cookie a second time (a layout cannot
  pass props down; the theme module stays free of `next/*`). The rail tooltip reads
  "Theme: Dark", naming the current pick; it shows on the returned focus after a
  pick and leaves with it, like the other rail items. `ActionResult` is declared per
  action file, as elsewhere.
