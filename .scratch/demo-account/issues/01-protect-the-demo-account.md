# 01: Protect the demo account

**What to build:** The `demo` user is seeded into production (`src/db/seed-demo.ts`,
`--allow-host`) so the journal can be shown to people with a shared password. Anyone
who has that password can today change it, turn on two-factor, delete the account or
sign the other visitors out, and so lock everyone else out or empty the demo, and can
upload screenshots that every other visitor then sees. Keep those from happening on
the demo account only, and keep anyone else from registering the username `demo`.
Everything else stays open to the visitor: logging trades and missed setups, accounts,
ledger, checklist, strategies, weekly reviews, import, export, display name and
timezone. (The username is already immutable for every user.)

This adds a rule for one special user next to the auth exceptions in
`context/coding-standards.md` → "Visibility", and an exception to "No sharing of any
kind" in `context/project-overview.md`; both are recorded in the same change.

**Blocked by:** —

**Status:** done

## Decisions (triage 2026-10-28, Sascha)

- **Production demo:** yes, as a deliberate exception. It holds made-up data only and
  shares no real user's journal; it is not a sharing feature (no links, no read-only
  view). Record it as a dated Decision in `context/project-overview.md` beside "No
  sharing of any kind", and as a rule in `context/coding-standards.md` → "Visibility".
- **Refused on the demo:** account security — change password, two-factor on or off,
  delete account — and screenshot uploads. Derived from "account security" during
  triage: signing out other sessions (revoke sessions) is refused too, since it would
  sign out every other visitor. Links on trades stay allowed (anchors only, nothing is
  stored or fetched).
- **Recognised by:** the username `demo`, one constant shared by the seed and the
  checks. No schema change, no environment variable.
- **Reserved:** registering `demo` is refused with the same message as any taken
  username, so the form does not reveal that the name is special.
- **Reset:** manual only — Sascha runs the seed with `--allow-host … --replace`
  (`context/operations.md` → Demo data). No cron.

## Acceptance

- [x] One pure check (for example `isDemoUsername` in `src/domain/`) with Vitest
      coverage, used by the seed and every refusal; the seed's `DEMO_USERNAME` comes
      from it.
- [x] Server-side refusals for the demo user, whatever the client sends: Better Auth
      change-password, two-factor enable/disable, delete-user and the revoke-session
      endpoints answer with an error; the screenshot upload route `POST /api/uploads`
      answers 403. Every other user is unaffected (tests for both sides where the
      seam allows).
- [x] Settings → Security on the demo shows the password, two-factor and delete rows
      without their actions and with one calm line saying they are off on the demo
      account; the trade form's evidence step (new and edit) offers no screenshot upload
      on the demo and says why; screenshots already on a trade still show. No other page changes.
- [x] Registering `demo` (any case) fails with "That username is taken. Pick another."
- [x] `context/project-overview.md` (dated Decision), `context/coding-standards.md` →
      "Visibility" and `context/operations.md` → Demo data describe the exception and
      the refusals.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px, against
      the local demo: the security rows, a refused password change and two-factor
      request sent directly to the API, the evidence step without upload, a normal user
      still able to change their password, and registration of `Demo` refused; no
      console errors.

## Do not build

- A demo flag in the schema, an environment variable for the name, or a list of
  reserved names beyond `demo`.
- A scheduled reset of the demo.
- Any read-only or shared view of a journal.

## Review

- `isDemoUsername` and `DEMO_USERNAME` live in `src/domain/demo.ts`; the seed imports
  the constant. `src/lib/auth/demo-guard.ts` holds the refused paths and the sign-up
  check; the `before` hook in `src/lib/auth/auth.ts` asks them, reading the session
  with `getSessionFromCtx` only on a refused path. `/api/uploads` answers 403 right
  after `getCurrentUser()`. Settings passes `demo` to the security section, which
  hides the three actions (`locked`) and shows one line; both trade pages pass
  `screenshotUploads`, which hides the drop zone and ⌘V paste. Existing screenshots
  still show and can still be removed (removal is not refused).
- Fixed in review: a sign-up with only `displayUsername: "Demo"` slipped past the
  reservation, because Better Auth runs our hook before the username plugin copies the
  display name into `username`. `signsUpAsDemo` now reads `username ?? displayUsername`;
  a test shows it (red first). This mattered only while no `demo` row exists, since the
  plugin refuses a taken name itself. The `isDemoUsername` comment gives the right
  reason for lowercasing.
- Checked in review, no change: `ctx.path` is the canonical endpoint path, so slashes
  or case cannot slip past; server-side `auth.api.*` calls run the same hooks; other
  endpoints that could lock visitors out are already closed (`/update-user` username,
  last-account unlink, backup codes without two-factor, unconfigured email flows).
- Left open: the hook's session check and the upload 403 have no Vitest test (no
  route or auth-hook test seam exists); the API run below covers them. One concept
  has four local names (`demo`, `locked`, `screenshotUploads`, `uploads`) and the
  "off on the demo account" wording is written in four places.
- Gates: lint, typecheck, test (1452 passed, none skipped), build. Against the local
  dev server as `demo`: change-password, two-factor enable and disable,
  revoke-other-sessions, revoke-sessions and delete-user each 403 "That is off on the
  demo account."; `POST /api/uploads` 403; the demo session stays valid and the demo
  row (id 20742) is unchanged. Browser at 1440 px and 390 px (reduced motion at 390):
  Settings → Security without the three actions and with the line; `/journal/new`
  evidence step with "Screenshots are off on the demo account.", no drop zone, links
  still there; no horizontal scroll. Registering `Demo` shows "That username is taken.
  Pick another." A throwaway user registered for the run could change its password
  (200) and saw the actions and the drop zone, and was then deleted; a DB query on
  `users.created_at` finds none left. Console: only the 400 of the refused `Demo`
  registration.
