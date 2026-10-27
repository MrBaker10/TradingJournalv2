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

**Status:** ready-for-agent

- [ ] One sheet component with a wide and a medium size; it slides fully in over 600 ms and out over 300 ms with the stated easings; with reduced motion emulated it appears and disappears without movement.
- [ ] Esc closes the sheet from anywhere inside it, including from a focused control; a key handler bound on the sheet receives keys while it is open; focus returns to the opening entry on close.
- [ ] Journal entry click opens the wide sheet with execution and process side by side, accounts, confluences, mistakes, notes, screenshots (lightbox opens and closes inside the sheet) and links with preview per the existing HTTPS rule; the network shows no extra request for the sheet's content.
- [ ] "Open page" leads to the trade's URL, "Edit" to the edit form; a missed setup opens in the same sheet, marked, without P&L or R.
- [ ] The detail page at the trade's URL shows the same content as the sheet in the page layout; a direct load works and the page is owned by the current user as today.
- [ ] Below `lg` the sheet takes the full width; the page keeps the 16 px gutter and does not scroll sideways.
- [ ] Old trade-detail components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open an entry, open the lightbox, close with Esc twice, "Open page", "Edit", back; reduced motion emulated once; no new console errors.

## Do not build

- The edit form itself; ticket 06.
- Holding the open entry in the URL.
- Any other page's sheet content; tickets 08–12 reuse the component.
