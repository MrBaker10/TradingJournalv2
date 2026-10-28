# 14: Login and Register

**What to build:** The first screen matches the rest. Login and Register are calm single
cards in the new tokens and fonts, with the shadcn input and button, field errors at
the field and the same auth behaviour as today (session, two-factor step, redirects).
The public route exceptions and their protections stay exactly as the coding standards
state them.

Spec: `.scratch/redesign/spec.md` → story 99. Design: `context/Design.md`. No
prototype; built from the tokens and form blocks.

**Blocked by:** 02 (Shell and tokens)

**Status:** done

- [x] Login and Register render as one card each in the new tokens outside the app shell; the theme class on `body` applies to them.
- [x] Login with password, the two-factor step and Register work as today with errors at the field; the redirects after success are unchanged.
- [x] The auth route exceptions are not broadened; the existing auth tests still pass.
- [x] At 390 px the card fits with the 16 px gutter and no horizontal scroll.
- [x] Old auth components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: wrong password, successful login, two-factor step, register validation; reduced motion emulated once; no new console errors.

## Do not build

- The landing page or billing.
- New auth features or providers.

## Review

- Login and Register are one `bg-card` card each (`AuthCard`, `max-w-sm`, `px-4` gutter)
  with no shell and no page glow; fields are `AuthTextField` (shadcn `Input` with the
  form blocks' `FieldLabel` and `FieldError`), the button is `AuthSubmit` (shadcn
  `Button`, pending as the account editor). The auth calls, the two-factor step, the
  backup-code switch and `router.replace("/dashboard")` are unchanged; `src/proxy.ts`
  and the `(auth)` layout's `force-dynamic` are untouched.
- The front page `/` shares `AuthCard`, so its two links moved to `buttonVariants`
  too. No behaviour changed there; the landing page stays out of scope.
- Fixed in review: an empty username now errors at the username field instead of
  under the password; the shared link style is one `AUTH_LINK`; the field is named
  `AuthTextField` (it also serves "Display name"); the login comment no longer cites
  the archived design document; the `card-surface`, `edge` and `page-glow` utilities
  lost their last use and are removed from `globals.css`.
- Left open: `AuthField` and `SubmitButton` stay, because the Settings password,
  two-factor and delete-account rows still use them (ticket 15 removes the last
  hand-built primitives), as do the now unused v1 tokens behind the removed utilities
  (`--gradient-card`, `--shadow-card`, `--gradient-edge`, …). Field errors appear and
  disappear as in the form blocks, so the card grows on a validation error.
- Changed after review on request: a failed sign-up other than a taken username is an
  error toast (`notifyError`, Design.md §3.11) instead of an inline line under the
  button; the form keeps its input. Browser at 1440 px and 390 px (reduced motion)
  with the sign-up request answered 500 in the browser: toast "Couldn't create the
  account. Try again.", inputs kept, still on `/register`, no horizontal scroll; no
  user was created (DB query on `users.created_at`).
- Gates: lint, typecheck, test (1439 passed, none skipped), build; browser at 1440 px
  and 390 px (reduced motion at 390): register with empty fields shows three field
  errors, register succeeds to `/dashboard`; login with an empty username errors at
  the field, a wrong password shows "Username or password is wrong." at the password,
  a user with two-factor gets the code step, a wrong code errors at the field, the
  backup switch works and the right code reaches `/dashboard`; the demo user signs in
  at 390. Card 16 px from each edge at 390, no horizontal scroll, `dark` on `body`.
  Console: only the two expected 401s of the wrong password and the wrong code. The
  run's user was created for it and deleted through the auth API; a DB query on
  `users.created_at` since the run start finds none left.
