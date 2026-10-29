# 02: Stored language, switches, shell and auth pages in German

**What to build:** The user picks English or German in Settings; the choice is stored
on the user and decides where unprefixed paths and sign-in lead. A new user starts in
the language of the page they registered on; existing users start in English. Signed
out, a footer switch on the auth pages sets a cookie and moves to the other prefix. The
demo user can switch for their own browser, but the demo user's stored language is
never written (ADR 0008). The shell, navigation and auth pages read German under `/de`.

**Blocked by:** 01 (Routing under a language prefix and language resolution).

Status: done

## Acceptance

- [x] Generated migration adds `users.language` (not null, check on the allowed set),
      existing rows `en`.
- [x] Registration on `/de/register` stores `de`; on `/en/register` stores `en`.
- [x] Settings switch saves through a Server Action that validates the value and writes
      only the current user's row; the page reloads under the new prefix.
- [x] Opening an `/en/…` link while set to German shows English and leaves the stored
      value unchanged; an unprefixed path and sign-in lead to the stored language.
- [x] Footer switch on front page, sign-in and registration sets the cookie; a reload of
      an unprefixed path keeps the choice.
- [x] Demo user: switching changes this browser only; the demo user's row stays `en`.
- [x] Shell, navigation, mobile drawer and auth pages fully German under `/de`; page
      titles translated.
- [x] Real Postgres tests (two users, rolled back): own row only, invalid value refused,
      demo row never written, registration value; none skipped.
- [x] Ordered verification gate passes; spec Acceptance steps 2–7 and 13 in the
      browser, both themes, phone width, no new console errors.

## Review

- Gate: lint, typecheck, test (106 files, 1609 tests, none skipped), build — green.
  Migration 0034 applied locally only.
- Browser (production build on :3001, `REGISTRATION_OPEN=true` for that process):
  steps 2–7 and 13 of the spec pass; DB query confirmed `de` for a `/de` registration,
  the demo row still `en`. Dark and light theme, 390px for the demo run. The first
  run's second demo sign-in hit Better Auth's rate limit (too many sign-ins in a
  minute); repeated after a pause, it landed on `/en/dashboard`. Test users created by
  the runs were deleted after a DB query showed they were the only rows created since
  the run started.
- Agreed deviations: the footer switch is a plain link and the proxy stores the
  language of every prefixed page in the cookie (no action without a session); the
  registration rule is tested as the pure `registrationLanguage`, not via a Postgres
  sign-up.
- Code review (standards + spec): fixed — on `/en/settings` with German stored,
  choosing English saved `en` but left the switch marking Deutsch (same URL, no
  refresh); now refreshes in place, checked in the browser. Not changed: action and
  query error strings are English sentences (ticket 05 turns them into keys); the
  control sits in its own "Language" section because Settings has no timezone control
  to stand next to; the query validates the language a second time, kept because the
  agreed seam tests "invalid value refused" at the query.
- Also translated here: Settings section labels and the table of contents, since the
  new section needed a translated heading.
