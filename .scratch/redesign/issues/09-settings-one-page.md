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

**Status:** done

- [x] One page with the four sections; the table of contents follows the scroll and lists each active account with stripe and rule dot; a click scrolls to the section or opens the account; it hides below `lg`.
- [x] Accounts table shows name, currency, starting balance, prop firm with rule dot and the practice stripe in mono figures; header and figure cells do not wrap; "Add account" and archived accounts sit under the table.
- [x] A row opens the medium sheet with details, commissions and prop firm link stacked; saving each part uses the existing server actions, lands errors at the field and confirms "Account saved"; archive and restore work from the sheet.
- [x] Sheet header shows "n / total" with previous and next; ↑/↓ move between accounts except while the focus is in a textarea or select; the key handler is bound on the sheet.
- [x] The `account` parameter holds the open account or `new`; a direct load opens the sheet; the dashboard's rule-status link opens the right account; Esc clears the parameter; a client-supplied ID that is not the user's opens nothing. The parameter rule is a lib function with Vitest tests.
- [x] Checklist template in three columns: add on Enter, remove on hover, rename, reorder; the existing checklist tests still pass.
- [x] Data and Security as rows with one action each; the two-factor setup and password change flows work as today; the danger zone is set apart in the negative colour and still confirms before deleting.
- [x] Old settings components without a remaining use are removed.
- [x] Gates: lint, typecheck, test, build. Browser at desktop width and 390 px: open, jump via the table of contents, open an account, next and previous with ↑/↓, save a change, Esc, reload with the parameter, add an account, edit the checklist; reduced motion emulated once; no new console errors.

## Do not build

- New account fields, limits or security behaviour.
- Tabs or sub-pages.
- Inline editing in the table.

## Review

Gates on the final tree: `pnpm lint`, `pnpm typecheck`, `pnpm test` (90 files, 1433
tests, none skipped) and `pnpm build` pass. Browser click path with Playwright against
the demo user at 1440 px and 390 px, plus once with reduced motion: 62 checks pass
(table of contents jumps, marks the section and opens accounts; "n / total" with
previous, next and ↑/↓ wrapping around; a focused select keeps its arrows; save with
"Account saved" and "Saved" on the button; a field error lands at the field; Esc with a
dirty draft asks, then clears the parameter; direct load and reload keep the sheet;
foreign and invalid ids open nothing; add, archive, restore and delete an account from
the sheet; checklist add on Enter, rename, move, remove with their toasts; the
dashboard's "Account rules" link opens the right sheet; no horizontal scroll at 390 px,
sheet full width; no movement under reduced motion; analytics table of contents still
follows). No console error and no hydration warning. Every record the run created was
removed and checked against a database query of the demo user.

- Decided by the user before implementation: one Save for the stacked editor (details,
  commissions, prop firm link through `createAccount`/`updateAccount`); archived
  accounts open in the sheet with Restore and Delete permanently, and previous/next
  count active accounts only; "Make default" and the account order (`moveAccount`)
  moved from the old row into the sheet.
- Decided by the user after review: the rule dot stays `positive` for "rules ok" as on
  the prototype; checklist add, rename and remove confirm with a toast ("Step added",
  "Step renamed", "Step removed"), a move does not; the editor file is
  `account-form.tsx`.
- Deviation to note: ↑/↓ also leave a focused date input alone (the evaluation start),
  which steps its segments with them, besides textarea and select.
- The `account` rule is `src/lib/settings/account-param.ts` with tests; the rule dot's
  state is `worstRuleState` in `src/domain/rule-status.ts` with tests. The parameter is
  written with `history.replaceState`, so stepping asks the server for nothing; the last
  written value is kept in a ref so a quick second ↓ steps from it.
- Found in the browser and fixed: the editor remounting per account took the focused
  field with it, so the next key missed the sheet (focus now moves to the sheet); the
  sr-only header cell widened the page at 390 px (the table's scroll box is
  `relative`).
- Fixed from review: one `useActiveSection` hook for the analytics and settings tables
  of contents; deleting an archived account clears the parameter; the practice stripe
  sits on the first cell; `AccountTarget` type; account actions use the settings row.
- Left as is: the password, two-factor and delete fields keep `AuthField` and
  `SubmitButton` in the v1 look until the login/register ticket; `RuleStatusLines` is
  shared with the dashboard card and keeps its tokens.
