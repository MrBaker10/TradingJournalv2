# 02: Theme menu in the sidebar

**What to build:** An icon button in the sidebar footer beside "Sign out" opens a menu
with Dark, Light and System. The icon shows the current pick (moon, sun, monitor), the
menu marks it. Picking one switches at once, without a transition, and is remembered on
this device. The button is there in the expanded sidebar, the collapsed rail (with a
tooltip like the other rail items) and the mobile drawer.

Spec: `.scratch/light-mode/spec.md`. Design: `context/Design.md` §3.1 (Theme).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Server action sets the `theme` cookie (one year, `SameSite=Lax`, path `/`) for a valid pick and refuses anything else; tested.
- [ ] Menu as a radio group with the current pick checked; keyboard operable; focus returns to the button on close.
- [ ] The class on `<body>` changes on the client at once; the server response agrees with it.
- [ ] Works for the demo account like any other user; a second browser keeps its own pick.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: switch through all three in the expanded sidebar, the rail and the drawer (below `lg`); reload keeps the pick; sign out and the sign-in page keeps it; no new console errors.
