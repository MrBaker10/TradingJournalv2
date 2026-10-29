# 01: Routing under a language prefix and language resolution

**What to build:** Every page lives under `/en/…` or `/de/…`; `/api/*` stays
unprefixed. A visitor opening a path without a prefix is redirected by one pure
language-resolution function (spec → Implementation Decisions), which the proxy calls
alongside the existing auth gate. The page declares its language in `<html lang>`.
Internal links and redirects keep the current prefix. Dictionaries for both languages
exist with a completeness check; interface text is still English in both.

**Blocked by:** None (can start immediately).

Status: ready-for-agent

## Acceptance

- [ ] `next-intl` installed at a version checked against its docs and Next 16's proxy
      guide; pin recorded in `package.json`.
- [ ] Signed out, `/` redirects to `/de` for a German `Accept-Language`, to `/en` for
      French or none; the front page, sign-in and registration are public under both
      prefixes and nothing else became public.
- [ ] Signed in, every page works under both prefixes; navigation, redirects after
      Server Actions and sign-out keep the prefix.
- [ ] `<html lang>` matches the prefix.
- [ ] Vitest table for the resolution function covers valid and invalid prefix,
      cookie, `Accept-Language` with regions and quality values, unsupported
      languages, nothing set, and the post-sign-in redirect (stored language passed in).
- [ ] Completeness test: German and English share one key set, no empty value.
- [ ] Ordered verification gate passes; browser check of both prefixes, signed out and
      signed in, with no new console errors.
