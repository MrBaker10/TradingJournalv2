# 05: Detail sheet and trade detail page

**What to build:** A click on a journal entry opens a wide detail sheet over the log, so
the trader never loses their place in the diary: execution and process side by side,
accounts, confluences and mistakes on the right, then notes, screenshots with the
lightbox and links with preview. "Open page" and "Edit" sit at the top. The sheet reads
the row's data and issues no second query. The full detail page keeps the trade's own
URL and shows the same content in the same layout, so a trade can be linked and
bookmarked. The journal detail is not held in the URL, because the trade has its page.

This ticket adds the one sheet component every later detail and editor uses: wide
(journal detail, analytics detail, compare) and medium (editors, firm page). It slides
fully in from the right over 600 ms with a soft ease-out and out over 300 ms with
ease-in; under reduced motion it appears without movement. Esc closes it. Keyboard
handling inside a sheet is bound on the sheet, because the dialog does not propagate
key events to the window.

Spec: `.scratch/redesign/spec.md` → Journal stories 28–30, Sheet pattern. Design:
`context/Design.md`. Source: the winning view on `prototype/redesign-journal` and the
verdict in its commit body; rewrite, do not copy.

**Blocked by:** 04 (Journal as a day log)

**Status:** done

- [x] One sheet component with a wide and a medium size; it slides fully in over 600 ms and out over 300 ms with the stated easings; with reduced motion emulated it appears and disappears without movement.
- [x] Esc closes the sheet from anywhere inside it, including from a focused control; a key handler bound on the sheet receives keys while it is open; focus returns to the opening entry on close.
- [x] Journal entry click opens the wide sheet with execution and process side by side, accounts, confluences, mistakes, notes, screenshots (lightbox opens and closes inside the sheet) and links with preview per the existing HTTPS rule; the network shows no extra request for the sheet's content.
- [x] "Open page" leads to the trade's URL, "Edit" to the edit form; a missed setup opens in the same sheet, marked, without P&L or R.
- [x] The detail page at the trade's URL shows the same content as the sheet in the page layout; a direct load works and the page is owned by the current user as today.
- [x] Below `lg` the sheet takes the full width; the page keeps the 16 px gutter and does not scroll sideways.
- [x] Old trade-detail components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open an entry, open the lightbox, close with Esc twice, "Open page", "Edit", back; reduced motion emulated once; no new console errors.

## Do not build

- The edit form itself; ticket 06.
- Holding the open entry in the URL.
- Any other page's sheet content; tickets 08–12 reuse the component.

## Review

Gates on the final tree: `pnpm lint`, `pnpm typecheck`, `pnpm test` (83 files, 1334
tests, none skipped) and `pnpm build` pass. Browser click path with Playwright against
the demo user at 1440 px, 390 px and once with reduced motion: 73 checks pass (slide
in mid-way at 50 ms and settled by 700 ms, `translate` over 0.6 s with
`cubic-bezier(0.32, 0.72, 0, 1)`, mid-way out at 150 ms; under reduced motion in place
at once; no fetch, xhr or document request when the sheet opens; wide sheet 1024 px,
full width at 390 px; dialog labelled by the symbol; execution and process side by
side, accounts on the right; lightbox over the sheet, Esc closes the lightbox, a second
Esc the sheet; focus back on the opening card; Esc from a focused link; a missed setup
marked without P&L or R; link anchors https with `noopener noreferrer`; "Open page"
and "Edit" and back; ctrl-click opens the page in a new tab and no sheet; the shell's
`C` stays out while the sheet is open; direct load 200, unknown id 404; no horizontal
scroll on the page at 390 px). The ticket 04 journal path still passes (73 checks). The
only console entries are the deliberate 404 and `motion`'s reduced-motion notice.

- Agreed before implementation: the FX "provisional rate" note shows on the page only,
  since it needs its own query; the price band and the strategy's rules stay in sheet
  and page; full width below `lg`, and Design §3.10 now says so (it said `sm`,
  contradicting §3.12 and this ticket). The entry card stays a link to the page: a plain
  click opens the sheet, a modifier or middle click the page.
- `src/components/ui/sheet.tsx`: shadcn's sheet with the full slide, sizes `wide`
  (`max-w-5xl`) and `medium` (`max-w-2xl`) from `lg`; reduced motion comes from the
  global block in `globals.css`. The backdrop dims with a fade; "no fade" in §3.10 is
  read as the panel's motion. The lightbox is a Base UI dialog now, so it nests in the
  sheet. No journal-specific sheet shortcuts were specified, so none were added;
  `SheetContent` forwards `onKeyDown`.
- `TradeDetailBody` serves sheet and page. The price band, the link card and the
  detail moved to the new tokens; the price band is shared with the trade form, which
  changes colour with it.
- Fixed from review: 40 px close targets on sheet and lightbox; entry and exit times
  no longer in `muted-foreground`; constant names; a stale comment in the link card.
- Removed with its last use: `trade-detail.tsx`.
- Open, for later tickets: analytics (ticket 08) needs `max-w-3xl`, a third size or a
  `className` on `SheetContent`; `StrategyRules` still uses v1 tokens (ticket 12);
  `TradeDetailBody` is long; chart-clock `slice(0, 5)` repeats in the journal.
- Settled after the commit: Design §3.10 now spells out that the journal detail is not
  in the URL, because the trade has its own page (be706fd).
