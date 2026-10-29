# 02: Stored language, switches, shell and auth pages in German

**What to build:** The user picks English or German in Settings; the choice is stored
on the user and decides where unprefixed paths and sign-in lead. A new user starts in
the language of the page they registered on; existing users start in English. Signed
out, a footer switch on the auth pages sets a cookie and moves to the other prefix. The
demo user can switch for their own browser, but the demo user's stored language is
never written (ADR 0008). The shell, navigation and auth pages read German under `/de`.

**Blocked by:** 01 (Routing under a language prefix and language resolution).

Status: ready-for-agent

## Acceptance

- [ ] Generated migration adds `users.language` (not null, check on the allowed set),
      existing rows `en`.
- [ ] Registration on `/de/register` stores `de`; on `/en/register` stores `en`.
- [ ] Settings switch saves through a Server Action that validates the value and writes
      only the current user's row; the page reloads under the new prefix.
- [ ] Opening an `/en/…` link while set to German shows English and leaves the stored
      value unchanged; an unprefixed path and sign-in lead to the stored language.
- [ ] Footer switch on front page, sign-in and registration sets the cookie; a reload of
      an unprefixed path keeps the choice.
- [ ] Demo user: switching changes this browser only; the demo user's row stays `en`.
- [ ] Shell, navigation, mobile drawer and auth pages fully German under `/de`; page
      titles translated.
- [ ] Real Postgres tests (two users, rolled back): own row only, invalid value refused,
      demo row never written, registration value; none skipped.
- [ ] Ordered verification gate passes; spec Acceptance steps 2–7 and 13 in the
      browser, both themes, phone width, no new console errors.
