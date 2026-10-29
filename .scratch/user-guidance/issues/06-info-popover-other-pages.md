# 06: Term explanations — remaining pages

**What to build:** The remaining terms get their info icon where each first matters:
Streak, Grace day and Consistency score on Progress and the dashboard; Practice account
in Settings → Accounts; Ledger net in the ledger; R multiple and MFE/MAE where Analytics
shows them. One icon per term per page, not on every repetition.

**Blocked by:** 05 (Term explanations — info popover and trade form).

Status: done

## Acceptance

- [x] Each listed page shows the icon at the agreed term and the explanation opens by
      click, tap and keyboard and closes with Escape.
- [x] Every one of the eleven terms is placed somewhere in the app.
- [x] No layout shift in cards, tables or headers caused by the icon; checked at phone
      width and in both themes; no new console errors.

## Review

Baseline: HEAD `0f3a1e3`. Two independent axes via the code-review skill.

- Placement: Dashboard — Streak beside "Longest N days" under the orb (the orb's own
  "day streak" label sits in a pointer-events-none overlay), Consistency score on the
  "Consistency" metric row. Progress — Streak and Consistency score beside the
  "Logging streak" and "Consistency this month" headings (beside, not inside, so the
  heading's name stays clean), Grace day in the heatmap legend. Settings → Accounts —
  Practice account on the account form's switch label, the field the term governs.
  Ledger — the "Ledger net" row. Analytics — R multiple after "avg R" in the page
  subtitle, the first place the page names it; MFE / MAE on the "Adverse excursion
  (MAE)" figure. With ticket 05 all eleven terms are placed.
- Not placed: Grace day on the dashboard, because the term does not appear there; the
  icon goes where the term is shown.
- Standards: the MFE / MAE icon was chosen inside `Excursions` by `kind`, tied to
  render order; it is now passed by the parent. Kept: `info` as a `ReactNode` slot on
  `MetricRow` and the analytics `Figure`, as on `FieldLabel` in ticket 05; the small
  flex wrapper beside four headings/labels stays inline rather than a new component.
- Verification: lint, typecheck, full test suite (1581 passed, none skipped) and build
  pass. Browser as the demo user, never saving: on dashboard, progress, settings
  (new-account sheet), ledger and analytics every icon opens by click, Enter and Space
  in Dark and by click and Enter in Light at 1280 px, and by tap in both themes at
  390 px; Escape or an outside tap closes it, focus returns to the icon after Escape,
  and Escape in the settings sheet closes only the popover. The row or heading
  holding each icon is as tall as its icon-less sibling (e.g. Consistency vs Badges
  row 20 px, Ledger net vs Payouts 19.5 px); the analytics subtitle wraps to two
  lines at 390 px with or without the icon; no horizontal scroll; no console errors
  beyond the known WebGL notice.
