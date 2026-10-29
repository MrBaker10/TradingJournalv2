# 06: Mistakes, confluences and badges translated

**What to build:** The fixed lists the app ships read in the interface language
wherever they appear (trade form, trade detail, journal row, analytics groupings,
progress badges). Mistakes and confluences get a stable `key` like badges already
have; the interface shows the dictionary text for the key. The stored English label
stays as reference and is what CSV export writes.

**Blocked by:** 01 (Routing under a language prefix and language resolution).

Status: ready-for-agent

## Acceptance

- [ ] Generated migration adds `key` (not null, unique) to `mistake_tags` and
      `confluence_tags`, filled for existing rows; the trade tag seeder sets keys and
      stays idempotent on them.
- [ ] Every mistake, confluence and badge key has an English and a German entry;
      the completeness test checks the seed data against the dictionaries.
- [ ] Under `/de` all tags and badges read German; Confluence and Mistake stay English
      as terms (`GLOSSARY.md` → German interface).
- [ ] CSV export of trades with tags is byte-identical in both languages.
- [ ] Real Postgres tests: unique keys, re-seeding changes nothing; none skipped.
- [ ] Ordered verification gate passes; browser check of trade form, trade detail,
      analytics by tag and progress in both languages.
