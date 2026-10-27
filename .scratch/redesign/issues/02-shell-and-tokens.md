# 02: Shell and tokens

**What to build:** Every page behind the session runs inside the new shell in the new
tokens, still with its old content. The sidebar is grouped into Daily (Dashboard, Trade
Journal, Econ Calendar), Review (Analytics, Progress, Ledger) and Set up (Strategies,
Prop Firm Rules, Settings). It collapses to a 56 px icon rail with tooltips; the toggle
sits beside the account selector, the key `[` does the same, and the collapsed state is
remembered in `localStorage`. ⌘K opens a command palette that lists pages, actions and
accounts. "Log trade" is the one filled primary button in the shell, reachable with `C`.
Shortcuts ignore events whose target is an input, textarea, select, editable element or
dialog, and check that the target is an element before calling `closest`. While a
practice account is selected a soft amber fog (two inset shadows, the values confirmed
on the dashboard prototype) covers the content area, not the sidebar. Below `lg` the
existing top bar and drawer stay and are restyled; the fog applies there too.

This ticket installs shadcn/ui on Base UI with the packages the prototype branch pinned
(the spec decided the stack) and adds the primitives the shell needs: button, tooltip,
dropdown menu, command palette, kbd, separator. Tokens move from the prototype's scoped
class to the global theme on `body` (the shadcn set plus `positive`, `negative`,
`process` and the practice fog), because overlays portal into `body`. The fonts stay
Instrument Sans for text and IBM Plex Mono for numbers. Old tokens stay until their last
use is gone.

Spec: `.scratch/redesign/spec.md` → Shell, Stack and tokens. Design: the new
`context/Design.md` (ticket 01). Source: the winning shell on `prototype/redesign-dashboard`
and the verdict in its commit body; rewrite, do not copy.

**Blocked by:** 01 (Document Design v2)

**Status:** done

- [x] shadcn/ui on Base UI and its generated primitives are installed with the versions from the prototype branch; the variant switcher, the `variant`/`view` parameters and any `prototype/` directory do not come over.
- [x] Theme class and font classes sit on `body`; the tokens are global; a tooltip and a menu that portal into `body` render in the new colours.
- [x] Sidebar shows the three groups with the current page highlighted; the collapsed rail shows icons with tooltips; the toggle button and `[` collapse and expand it; a reload keeps the state.
- [x] ⌘K opens the palette; typing filters pages, actions and accounts; picking a page navigates, picking an account switches the scope, Esc closes it.
- [x] "Log trade" is the only filled primary button in the shell; `C` opens the trade form; `C` and `[` do nothing while the focus is in a field, an editable element or an open dialog.
- [x] With a practice account selected the fog covers the content area and not the sidebar, on desktop and in the mobile shell; with a real account or all accounts there is no fog.
- [x] Below `lg` the top bar and drawer behave as before (open, navigate, Esc, backdrop, resize across `lg`) in the new tokens; the mobile-shell tests still pass.
- [x] No hex or rgba literal in a new component; SVG colours come from classes.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: collapse and expand, `[`, ⌘K page and account, `C` from a page and `C` inside a field, practice fog on and off, drawer flow; reduced motion emulated once; no new console errors and no hydration warning on a clean load.

## Do not build

- Any page content; the pages keep their old markup inside the new shell until their ticket.
- The sheet primitive; it arrives with its first use in ticket 05.
- Removing old tokens or hand-built primitives that still have a use.
- The landing page, billing or GSAP.

## Review

Gates on the final tree: `pnpm lint`, `pnpm typecheck`, `pnpm test` (80 files, 1340
tests, none skipped; the local DB on 5433 was migrated from 25 to 32 migrations first)
and `pnpm build` pass. Browser click path with Playwright at 1440 px and 390 px, plus
once with reduced motion: 36 checks pass, no console error and no hydration warning.

- Packages as pinned on `a4f742b`: `@base-ui/react`, `class-variance-authority`,
  `cmdk`, `cn`, `shadcn`, `tw-animate-css`. `gsap`, `@gsap/react`, `three` and
  `@types/three` stay out until a ticket uses them. `dialog`, `input-group`, `input` and
  `textarea` came in because the generated `command` imports them.
- Base UI's `Menu.RadioItem` keeps the menu open by default (`closeOnClick: false`);
  the account switcher sets it, found in the browser run.
- ⌘K is ignored from a field like `C` and `[`, as the ticket's rule reads; inside the
  open palette Esc closes it.
- Fixed from review: 40 px drawer items (Design §5), no `muted-foreground` on controls,
  `useSelectAccount` in `src/hooks/`, a pure state updater, `src/lib/utils.ts` for the
  shadcn `utils` alias.
- Open, for later tickets: the collapsed rail paints expanded for one frame on reload
  (localStorage is read after mount); the fog sits at `z-30` over page content and its
  left edge repeats the sidebar widths; the tooltip and kbd label read `⌘K` on every OS;
  practice rows in the switcher carry a badge, not the stripe (Design §1.7 vs §3.1).
- Removed with their last use: `--shadow-practice`, `--color-nav-hover`,
  `--color-nav-active-ring`, `--color-divider-glow`. The v1 page glow moved into the
  `(auth)` layout until ticket 14.
