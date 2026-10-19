# 06: Dashboard "Rule status" card

**What to build:** When exactly one linked account is selected, the dashboard shows a
"Rule status" card with each rule's status and distance, the same as the account's
settings. For "All accounts", several accounts or an unlinked account, the card is not
shown. No rule state creates a notification, badge, score change or celebration.

Spec: `.scratch/prop-firm-link/spec.md` (UI; User Stories 26, 30).

**Blocked by:** 02 (Rule status in settings)

**Status:** done

- [x] Card rendered only when the selection is exactly one linked account; hidden for "All accounts", multiple accounts and unlinked accounts.
- [x] Reuses the domain module's output; figures stay in USD regardless of display currency.
- [x] Amber/red via existing semantic tokens; no glow, motion celebration, badge or score effect.
- [x] `context/Design.md`: rule status section covers the dashboard card.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser: card visible with one linked account selected, hidden for "All accounts"; no new console errors.

## Review

Two-axis review (standards, spec) against `57aafbb` on 2026-10-20, uncommitted tree.

Fixed:
- An archived linked account could still be `users.selected_account_id` (archiving keeps
  the selection) while the switcher already reads "All accounts"; the card would have
  shown under that label. `getAccountRules` now returns active accounts only; DB test
  added. Clearing the selection on archive stays as it is (existing behaviour).
- The card takes one `LinkedRuleStatus` (link + attempt, a named type next to
  `AttemptStatus`) instead of firm, program and attempt separately.

Left open on purpose:
- Settings panel and dashboard card repeat a small header block; they differ on purpose
  (`h4` in the row, `h2` with firm and program on the card).
- `AccountRulesRow` carries `startingBalanceUsdCents`, an `accounts` column: it is the
  attempt's starting balance, which every rule status needs with the link.
- "Multiple accounts" cannot be selected: the switcher holds one account or "All
  accounts" (`users.selected_account_id`), so that case is hidden by construction.
- No linked non-USD account exists locally, so "USD whatever the display currency" is
  checked by reading the code (`formatCents` without a currency), not in the browser.

Browser (2026-10-20, local dev): dashboard with "Lucid 25k Eval" selected → card
"Rule status · Lucid Trading · LucidFlex 50k · Since 15 Sep 2026" between metric panel
and equity curve, the same lines as settings; "All accounts" → no card (also after
reload); "Live" (unlinked) → no card; back to Lucid → card after reload. Settings still
show exactly one panel with the same figures. No console errors.
