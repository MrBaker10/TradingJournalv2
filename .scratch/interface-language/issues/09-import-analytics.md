# 09: Import wizard and analytics in German

**What to build:** Under `/de` every interface text reads German on the CSV import wizard (steps, mapping, preview, results) and the analytics page (filters, charts, axis and legend labels). Established
trading terms stay English (`GLOSSARY.md` → German interface); user-entered text and
outside data stay unchanged. English wording is unchanged.

**Blocked by:** 01, 03, 05.

Status: ready-for-agent

## Acceptance

- [ ] No English interface text left on these pages under `/de`, including empty
      states, buttons, dialogs, tooltips, accessible labels and page titles.
- [ ] Completeness test passes for every new key.
- [ ] Importing the same broker CSV in both languages yields the same trades.
- [ ] Ordered verification gate passes; browser check of these pages in both
      languages, both themes and at phone width, no new console errors.
