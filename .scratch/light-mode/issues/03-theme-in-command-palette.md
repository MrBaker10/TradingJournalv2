# 03: Theme in the command palette

**What to build:** The command palette (⌘K) offers a group "Theme" with Dark, Light and
System. Choosing one switches the theme exactly like the sidebar menu and closes the
palette; the current pick is marked.

Spec: `.scratch/light-mode/spec.md`. Design: `context/Design.md` §3.1 (Theme, Keys).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The three actions reuse the server action and client switch from 02.
- [ ] Typing "light", "dark", "system" or "theme" finds them.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: ⌘K, pick each theme by keyboard, palette closes, theme applied; the sidebar icon shows the same pick; no new console errors.
