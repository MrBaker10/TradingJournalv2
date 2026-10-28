# 04: Source list for every prop firm

**What to build:** Every prop firm's official source pages are recorded in one file in the
repo, so each data refresh checks the same pages. It is filled from the research notes of
the prop-firm-sizes feature, official pages only (firm website, help center, FAQ, terms,
checkout). A test keeps the list in step with the prop firm data file.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Prop firm, Source list.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The source list holds, per firm, every official URL the research notes cite for it; no review, affiliate or community sites.
- [x] A small parser reads the source list, covered by Vitest.
- [x] A test fails when a firm in the prop firm data file has no entry in the source list, or the source list names a firm the data file does not have, or a URL is not https.
- [x] Full gate; no browser check needed (no screen changes), stated as such.

## Review

Standards:
- Fixed: the comment above `readUrl` cited a section that does not exist; it now names
  coding-standards.md → External links on trades.
- Fixed: both URL errors now name the firm, as the PropFirmsData.md parser does.
- Fixed: the loop and the heading match follow `parse.ts` (`split(/\r?\n/)`, `for … of`,
  `/^##\s+(.+)$/`).
- Left open (judgement call): `readUrl` and `fail` repeat the shape of `readWebsite` and
  `fail` in `parse.ts`. A shared helper would change `parse.ts`, which is outside this
  ticket.

Spec: all 193 https URLs the three research notes cite sit under the right firm, with
nothing extra; propfirmmatch.com and Apex's `…/help-center/<id>` placeholder are left out.
The parser also rejects a firm without URLs, a firm listed twice and a line that is not
`- <url>`, following the strict PropFirmsData.md parser. research-07 names
`e8markets.com/futures` without a scheme (unreadable at the time); added as
`https://e8markets.com/futures` by user decision, so E8 Markets has its website too.

Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (96 files, 1462 passed, none
skipped), `pnpm build` all pass. Mutation check: renaming "BluSky" in the source list and
turning one of its URLs into http each failed the real-file test; the file was restored
and byte-compared. No browser check: no screen changes.
