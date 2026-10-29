# 08: Journal, trade form and info popovers in German

**What to build:** Under `/de` every interface text reads German on the journal list and filters, trade detail and edit, the new trade and missed setup form, screenshots and links, and every info popover; the popover texts move into the dictionaries and the check that each names existing `GLOSSARY.md` entries stays. Established
trading terms stay English (`GLOSSARY.md` → German interface); user-entered text and
outside data stay unchanged. English wording is unchanged.

**Blocked by:** 01, 03, 05.

Status: ready-for-agent

## Acceptance

- [ ] No English interface text left on these pages under `/de`, including empty
      states, buttons, dialogs, tooltips, accessible labels and page titles.
- [ ] Completeness test passes for every new key.
- [ ] Ordered verification gate passes; browser check of these pages in both
      languages, both themes and at phone width, no new console errors.
