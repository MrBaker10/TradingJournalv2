# 01: Routing under a language prefix and language resolution

**What to build:** Every page lives under `/en/…` or `/de/…`; `/api/*` stays
unprefixed. A visitor opening a path without a prefix is redirected by one pure
language-resolution function (spec → Implementation Decisions), which the proxy calls
alongside the existing auth gate. The page declares its language in `<html lang>`.
Internal links and redirects keep the current prefix. Dictionaries for both languages
exist with a completeness check; interface text is still English in both.

**Blocked by:** None (can start immediately).

Status: done

## Acceptance

- [x] `next-intl` installed at a version checked against its docs and Next 16's proxy
      guide; pin recorded in `package.json`.
- [x] Signed out, `/` redirects to `/de` for a German `Accept-Language`, to `/en` for
      French or none; the front page, sign-in and registration are public under both
      prefixes and nothing else became public.
- [x] Signed in, every page works under both prefixes; navigation, redirects after
      Server Actions and sign-out keep the prefix.
- [x] `<html lang>` matches the prefix.
- [x] Vitest table for the resolution function covers valid and invalid prefix,
      cookie, `Accept-Language` with regions and quality values, unsupported
      languages, nothing set, and the post-sign-in redirect (stored language passed in).
- [x] Completeness test: German and English share one key set, no empty value.
- [x] Ordered verification gate passes; browser check of both prefixes, signed out and
      signed in, with no new console errors.

## Review

- Gate: lint, typecheck, test (105 files, 1599 tests, none skipped), build — green.
- Browser (production build on :3001, demo user): `/` → `/de` or `/en` by
  `Accept-Language`; `/journal` signed out → `/de/login`; login → `/de/dashboard`;
  sidebar links, `journal?page=999` redirect, analytics range `router.push` and sign-out
  keep the prefix; 390px and light theme; console only the known WebGL noise.
- Not checked in the browser: a page refreshing after a Server Action write
  (`revalidatePage`); it needs a demo-data write. Covered by typecheck and build only.
- The running `pnpm dev` reloaded `/de` in a loop (Fast Refresh) after the route move;
  the production build does not. Recheck after a dev-server restart.
- Build scripts of `@parcel/watcher` and `@swc/core` (pulled in by next-intl) set to
  `false` in `pnpm-workspace.yaml`, like `sharp`.
