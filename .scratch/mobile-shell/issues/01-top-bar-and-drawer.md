# 01: Top bar and drawer

**What to build:** Below `lg`, every page behind the session opens with a slim top bar
— the current page's title and a menu button — instead of the stacked sidebar. The menu
button opens the existing sidebar content (brand, navigation, account selector, user
block with sign-out) as a drawer over the page. Picking a page, pressing Escape, tapping
the backdrop or the close control closes it. From `lg` upwards the shell is unchanged.
The account selector stays inside the drawer in this ticket; ticket 02 moves it into the
top bar.

Spec: `.scratch/mobile-shell/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `context/Design.md` has a section for top bar and drawer (surface, spacing, states, motion), written before the components.
- [x] Sidebar content is split into parts that sidebar and drawer share; one navigation list, no duplicated markup.
- [x] Below `lg`: top bar with the active navigation item's label as title and a menu button with `aria-expanded`/`aria-controls`; no page passes its own title.
- [x] Drawer opens over the content with a backdrop; body scroll is locked while open.
- [x] Drawer closes on route change, Escape, backdrop tap and a close control; focus moves into the drawer on open and back to the menu button on close.
- [x] Active page is highlighted in the drawer as in the sidebar; sign-out works from the drawer.
- [x] Enter/exit animate with `motion`; with reduced motion emulated the drawer appears without sliding. _(reduced motion checked by Sascha in Chrome)_
- [x] Resizing across `lg` with the drawer open leaves only the desktop sidebar, never both.
- [x] From `lg` upwards nothing changes (layout, sticky sidebar, own scroll area).
- [x] Gates: lint, typecheck, test (reduced-motion guard test still passes), build.
- [x] Browser at ≈390px and desktop width: open → navigate → closed on the new page; open → Escape; open → backdrop; sign-out reachable; resize across `lg`; no new console errors. _(reduced motion checked by Sascha)_

## Review

Two-axis review (standards, spec) against `main` on 2026-10-19.

Fixed:
- The dialog's native `close` now resets the state (`onClose`): a non-cancelable
  `cancel` (repeated Escape) closed it while the state stayed open — scroll lock kept,
  menu button dead.
- At `lg` the dialog closes at once instead of after the exit animation of an
  already hidden subtree, so the desktop page can never stay inert.
- `coding-standards.md` → Motion lists the mobile drawer, matching Design.md §5.
- Design.md §4.1 names the menu button's focus ring and `aria-expanded`; the title's
  undocumented `font-medium` removed.
- Layout builds the shell props once; the account selector's portal anchor is named
  `menuAnchor` (it holds the container, not only a position).

Left open deliberately:
- Backdrop `bg-black/60`: no overlay token exists; the screenshot lightbox does the
  same. A token is its own design change.
- Scroll lock via `documentElement.style.overflow` and the breakpoint listener stay in
  the component; extracting hooks has no second caller yet.
- Easing curve and icon-button classes are not shared modules; consolidating them
  touches files outside this ticket.

Verification: lint, typecheck, 1007 tests in 58 suites, build. Chrome, app in a 390px
same-origin iframe (the window could not be resized): top bar with title, drawer
open (modal, focus on close button, scroll lock), Escape (focus back on menu button),
backdrop tap, close button, navigation to Trade Journal/Analytics closes it and updates
the title, account selector menu opens inside the drawer and is clickable, sign-out
present, native `close()` resets state and reopens, resize to 1100px closes it at once
with only the sidebar visible and the page interactive. No app console errors.
Reduced motion (DevTools emulation) checked by Sascha on 2026-10-19.

Checkpoint approved 2026-10-19.
