# 02: Progress — calm badges and a compact look back

**What to build:** Earned badges move to the calm process surface, so their tile is never
brighter than the badge it labels; open badges stay matte and earned ones stay clearly
distinct. The "evaluated once the month is over" hint uses the subtle text colour
instead of amber. "Past months" without a frozen month shrinks to one compact line.

Spec: `.scratch/progress-analytics-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Design.md first: §4.14 lists earned badges among the calm surfaces; §4.24 describes the compact empty state.
- [ ] Earned badge: soft gradient, 1px accent inset, no outer glow, cyan icon; open badge unchanged.
- [ ] Amber no longer used for the badge hint (amber stays for rule limits and practice accounts, §1).
- [ ] Past months with data unchanged.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: earned and open badges side by side, the "Dialled In" hint, empty past months; no new console errors.
