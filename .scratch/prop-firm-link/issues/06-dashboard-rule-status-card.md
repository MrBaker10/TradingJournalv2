# 06: Dashboard "Rule status" card

**What to build:** When exactly one linked account is selected, the dashboard shows a
"Rule status" card with each rule's status and distance, the same as the account's
settings. For "All accounts", several accounts or an unlinked account, the card is not
shown. No rule state creates a notification, badge, score change or celebration.

Spec: `.scratch/prop-firm-link/spec.md` (UI; User Stories 26, 30).

**Blocked by:** 02 (Rule status in settings)

**Status:** ready-for-agent

- [ ] Card rendered only when the selection is exactly one linked account; hidden for "All accounts", multiple accounts and unlinked accounts.
- [ ] Reuses the domain module's output; figures stay in USD regardless of display currency.
- [ ] Amber/red via existing semantic tokens; no glow, motion celebration, badge or score effect.
- [ ] `context/Design.md`: rule status section covers the dashboard card.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: card visible with one linked account selected, hidden for "All accounts"; no new console errors.
