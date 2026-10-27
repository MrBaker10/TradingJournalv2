# 09: Settings on one page

**What to build:** Settings is one page with Accounts, Checklist, Data and Security and
a table of contents that follows the scroll; under Accounts the table of contents lists
every account with its practice stripe and rule dot. The accounts table shows name,
currency, starting balance, prop firm with rule dot and the practice stripe; "Add
account" and the archived accounts sit under it. A row opens the editor in the medium
sheet with details, commissions and prop firm link stacked; the sheet header shows
"n / total" with previous and next, and ↑/↓ do the same unless the focus is in a
textarea or select. The open account is the `account` search parameter (`new` for a new
one), so the dashboard's rule-status card links straight into the sheet and a reload
keeps it; Esc closes the sheet and clears the parameter. The checklist template is three
columns with add on Enter and remove on hover; its limits and reorder behaviour are
unchanged. Export, username, password and two-factor are rows with one action each; the
danger zone is set apart in the negative colour. Every save confirms the action
("Account saved").

Spec: `.scratch/redesign/spec.md` → Settings, Many sections pattern. Design:
`context/Design.md`. Source: the winning view on `prototype/redesign-settings` and the
verdict in its commit body; rewrite, do not copy.

**Blocked by:** 05 (Detail sheet and trade detail page)

**Status:** ready-for-agent

- [ ] One page with the four sections; the table of contents follows the scroll and lists each active account with stripe and rule dot; a click scrolls to the section or opens the account; it hides below `lg`.
- [ ] Accounts table shows name, currency, starting balance, prop firm with rule dot and the practice stripe in mono figures; header and figure cells do not wrap; "Add account" and archived accounts sit under the table.
- [ ] A row opens the medium sheet with details, commissions and prop firm link stacked; saving each part uses the existing server actions, lands errors at the field and confirms "Account saved"; archive and restore work from the sheet.
- [ ] Sheet header shows "n / total" with previous and next; ↑/↓ move between accounts except while the focus is in a textarea or select; the key handler is bound on the sheet.
- [ ] The `account` parameter holds the open account or `new`; a direct load opens the sheet; the dashboard's rule-status link opens the right account; Esc clears the parameter; a client-supplied ID that is not the user's opens nothing. The parameter rule is a lib function with Vitest tests.
- [ ] Checklist template in three columns: add on Enter, remove on hover, rename, reorder; the existing checklist tests still pass.
- [ ] Data and Security as rows with one action each; the two-factor setup and password change flows work as today; the danger zone is set apart in the negative colour and still confirms before deleting.
- [ ] Old settings components without a remaining use are removed.
- [ ] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, jump via the table of contents, open an account, next and previous with ↑/↓, save a change, Esc, reload with the parameter, add an account, edit the checklist; reduced motion emulated once; no new console errors.

## Do not build

- New account fields, limits or security behaviour.
- Tabs or sub-pages.
- Inline editing in the table.
