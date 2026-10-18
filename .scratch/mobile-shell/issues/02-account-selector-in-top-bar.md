# 02: Account selector in the top bar

**What to build:** Below `lg`, the account selector sits in the top bar and is always
visible, so the trader never reads figures without seeing which account they belong to.
It is no longer inside the drawer at that width. While a practice account is selected,
the top bar carries the amber edge stripe as well. Switching behaves exactly as on
desktop, including the remembered selection per user and practice accounts only being
selectable on their own.

Spec: `.scratch/mobile-shell/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01 (Top bar and drawer)

**Status:** ready-for-agent

- [ ] Below `lg` the account selector renders in the top bar, once; the drawer no longer contains it at that width. From `lg` it stays in the sidebar.
- [ ] The selector's open menu stays fully on screen at ≈390px width.
- [ ] Selecting a practice account shows the amber edge stripe on the top bar (and keeps it on the main area); "All accounts" removes it.
- [ ] Selection is remembered across reloads and matches the desktop selection.
- [ ] `context/Design.md` top bar section and §4.12 updated for the selector's mobile placement.
- [ ] Gates: lint, typecheck, test, build.
- [ ] Browser at ≈390px and desktop width: switch to a practice account (stripe visible), back to "All accounts", reload keeps the selection; no new console errors.
