# 14: Login and Register

**What to build:** The first screen matches the rest. Login and Register are calm single
cards in the new tokens and fonts, with the shadcn input and button, field errors at
the field and the same auth behaviour as today (session, two-factor step, redirects).
The public route exceptions and their protections stay exactly as the coding standards
state them.

Spec: `.scratch/redesign/spec.md` → story 99. Design: `context/Design.md`. No
prototype; built from the tokens and form blocks.

**Blocked by:** 02 (Shell and tokens)

**Status:** ready-for-agent

- [ ] Login and Register render as one card each in the new tokens outside the app shell; the theme class on `body` applies to them.
- [ ] Login with password, the two-factor step and Register work as today with errors at the field; the redirects after success are unchanged.
- [ ] The auth route exceptions are not broadened; the existing auth tests still pass.
- [ ] At 390 px the card fits with the 16 px gutter and no horizontal scroll.
- [ ] Old auth components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: wrong password, successful login, two-factor step, register validation; reduced motion emulated once; no new console errors.

## Do not build

- The landing page or billing.
- New auth features or providers.
