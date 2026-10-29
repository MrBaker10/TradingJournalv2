# 03: Theme in the command palette

**What to build:** The command palette (⌘K) offers a group "Theme" with Dark, Light and
System. Choosing one switches the theme exactly like the sidebar menu and closes the
palette; the current pick is marked.

Spec: `.scratch/light-mode/spec.md`. Design: `context/Design.md` §3.1 (Theme, Keys).

**Blocked by:** 02

**Status:** done

- [x] The three actions reuse the server action and client switch from 02.
- [x] Typing "light", "dark", "system" or "theme" finds them.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: ⌘K, pick each theme by keyboard, palette closes, theme applied; the sidebar icon shows the same pick; no new console errors.

## Review

- No unit test, as the spec's Testing Decisions say; covered by the browser path.
- Standards: the current pick carries `aria-checked` (Design.md §5) besides the
  `data-checked` that shows the check icon. `THEME_OPTIONS` (labels and icons) moved to
  `theme-options.ts` beside `nav-items.ts`, shared by the menu and the palette. The
  input placeholder names the theme too.
- Left as is: the palette and the sidebar menu each call `useThemePick`; after a pick
  in the palette the sidebar icon follows once the action's re-render arrives (the
  palette has closed by then). Lifting the hook into `AppShell` would make it one
  state, at the cost of reworking ticket 02's wiring.
- Docs: Design.md §3.1 Keys still lists the palette as "pages, actions, account
  switch" without the theme.
