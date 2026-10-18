# Spec: Mobile app shell

Status: done

Roadmap: `context/project-overview.md` → Phase 3, item 2. Terms: `GLOSSARY.md`.

## Problem Statement

On a phone the app shell has no layout of its own. Below `lg` the sidebar is stacked
above the page, so every page opens with the full navigation, the account selector and
the user block before any content, and the trader scrolls past it on every visit. Logging
a trade or checking the pre-market plan from a phone — the moment journaling most often
gets skipped — is needlessly slow.

## Solution

Below `lg` the shell becomes a slim top bar: the current page title, the account selector
and a menu button. The menu button opens the existing sidebar as a drawer over the
content; choosing a page or dismissing the drawer closes it. The account selector stays
visible in the top bar at all times because it decides which figures the page shows, and
a selected practice account keeps its amber edge stripe there. From `lg` upwards nothing
changes.

## User Stories

1. As a trader on a phone, I want a page's content to start right below a slim top bar, so that I see my data without scrolling past navigation.
2. As a trader on a phone, I want the current page's title in the top bar, so that I know where I am.
3. As a trader on a phone, I want a menu button in the top bar, so that I can reach every page.
4. As a trader on a phone, I want the menu to open as a drawer with the same items as the desktop sidebar, so that navigation works the same everywhere.
5. As a trader on a phone, I want the drawer to close when I pick a page, so that I land on the page without an extra tap.
6. As a trader on a phone, I want to close the drawer by tapping outside it, pressing Escape or tapping a close control, so that I can back out without navigating.
7. As a trader on a phone, I want the active page highlighted in the drawer, so that the drawer orients me like the sidebar does.
8. As a trader on a phone, I want the account selector always visible in the top bar, so that I never misread figures for the wrong account.
9. As a trader on a phone, I want a selected practice account to show its amber edge stripe in the top bar, so that I never mistake practice figures for real ones.
10. As a trader on a phone, I want switching accounts from the top bar to behave exactly like on desktop, so that my remembered selection stays the same across devices.
11. As a trader on a phone, I want the page underneath not to scroll while the drawer is open, so that closing the drawer returns me to where I was.
12. As a keyboard or screen-reader user, I want the menu button to announce whether the drawer is open, and focus to move into the drawer and back to the button on close, so that the drawer is usable without touch.
13. As a trader who prefers reduced motion, I want the drawer to appear without sliding, so that the app respects my system setting.
14. As a trader on a desktop, I want the shell unchanged from `lg` upwards, so that nothing I rely on moves.
15. As a trader rotating a tablet across the `lg` boundary, I want an open drawer to give way to the sidebar cleanly, so that I never see both at once.
16. As a trader on a phone, I want the user block and sign-out available inside the drawer, so that nothing from the sidebar is lost.

## Implementation Decisions

- Breakpoint: the existing `lg` boundary already used by the app layout to stack the
  shell. Below it the top bar and drawer; from it the current sidebar.
- The drawer renders the existing sidebar content (navigation items, user block); there is
  one list of navigation items, shared by sidebar and drawer.
- The account selector moves into the top bar below `lg` and is not duplicated inside the
  drawer. Its behaviour (remembered selection per user, practice only selectable on its
  own) is unchanged.
- The practice edge stripe that the layout applies to the main area keeps working, and
  the top bar carries it too while a practice account is selected.
- Page title in the top bar is derived from the active navigation item; no page has to
  pass a title.
- Drawer state is client-only and closes on route change. Body scroll is locked while open.
- Motion follows `context/Design.md` §5: the drawer's enter/exit uses the root
  `MotionConfig reducedMotion="user"`; hover and press states stay CSS.
- `context/Design.md` gets a section for the top bar and drawer (tokens, spacing, states),
  written before the component.
- No new dependency; no schema change.

## Testing Decisions

- There are no component tests and no E2E script, so the seam is the browser click path,
  run at a phone width (≈390px) and at desktop width:
  open drawer → navigate → drawer closed on the new page; open → Escape; open → tap
  outside; switch account in the top bar, including selecting a practice account (stripe
  visible) and back to "All accounts"; reduced motion emulated; resize across `lg` with
  the drawer open. Console free of new errors on every step.
- The existing reduced-motion guard test must keep passing.
- Full gate from `context/ai-interaction.md`: lint, typecheck, test, build, then browser.

## Out of Scope

- Bottom navigation or an icon rail (rejected in favour of the drawer).
- Redesigning individual pages for mobile; each page keeps its own responsive behaviour.
- Light mode, gestures (swipe to open), PWA or install prompts.
- Any change to navigation items or their order.

## Further Notes

- Resolves the Open Question "Mobile layout of the app shell" in
  `context/project-overview.md`.
- Branch `feature/mobile-shell` is created only after `account-settings-redesign` is
  merged, because its stacking change in the app layout is the starting point here.
