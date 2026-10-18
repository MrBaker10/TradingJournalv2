# 02: Account selector in the top bar

**What to build:** Below `lg`, the account selector sits in the top bar and is always
visible, so the trader never reads figures without seeing which account they belong to.
It is no longer inside the drawer at that width. While a practice account is selected,
the top bar carries the amber edge stripe as well. Switching behaves exactly as on
desktop, including the remembered selection per user and practice accounts only being
selectable on their own.

Spec: `.scratch/mobile-shell/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 01 (Top bar and drawer)

**Status:** done

- [x] Below `lg` the account selector renders in the top bar, once; the drawer no longer contains it at that width. From `lg` it stays in the sidebar.
- [x] The selector's open menu stays fully on screen at ≈390px width.
- [x] Selecting a practice account shows the amber edge stripe on the top bar (and keeps it on the main area); "All accounts" removes it.
- [x] Selection is remembered across reloads and matches the desktop selection.
- [x] `context/Design.md` top bar section and §4.12 updated for the selector's mobile placement.
- [x] Gates: lint, typecheck, test, build.
- [x] Browser at ≈390px and desktop width: switch to a practice account (stripe visible), back to "All accounts", reload keeps the selection; no new console errors.

## Review

Two-axis review (standards, spec) against `4735fe4` on 2026-10-19.

Fixed:
- The menu's measured position is a narrow `MenuPosition` type again instead of
  `CSSProperties`, so the inline style can only carry the measured screen position.
- The menu closes on any window resize: its position was measured on open, and across
  `lg` its switcher may be gone from the screen.
- "Practice account selected" is decided once in the layout and passed to the mobile
  shell; the top bar and main read the same value.
- Menu offset named (`MENU_OFFSET`); Design.md §4.12 names the top bar's stripe.

Left open deliberately:
- The inline `style` for the measured position predates this ticket; whether
  `coding-standards.md` should name that exception explicitly is Sascha's decision.
- `placement === "topBar"` is checked three times; two variants stay readable without
  a lookup map.
- `ShellProps` stays in `sidebar.tsx`: there is no `src/types/` yet, and one interface
  does not justify starting it.

Verification: lint, typecheck, 1007 tests in 58 suites, build. Chrome, app in a 390px
same-origin iframe: selector in the top bar, not in the drawer; its menu opens
downward at x 107–347 (240px wide, inside the screen); selecting a temporary local
practice account shows the amber stripe on top bar and main and keeps it after reload;
"All accounts" removes it; an open menu closes on resize; at 1100px the sidebar
selector opens upward at its own width. Selection restored to "Lucid 25k Eval". The
temporary account "Practice Check (temp)" was deleted permanently afterwards, at
Sascha's request. No app console errors.

Checkpoint approved 2026-10-19.
