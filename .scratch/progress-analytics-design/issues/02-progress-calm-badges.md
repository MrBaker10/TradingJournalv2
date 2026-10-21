# 02: Progress — calm badges and a compact look back

**What to build:** Earned badges move to the calm process surface, so their tile is never
brighter than the badge it labels; open badges stay matte and earned ones stay clearly
distinct. The "evaluated once the month is over" hint uses the subtle text colour
instead of amber. "Past months" without a frozen month shrinks to one compact line.

Spec: `.scratch/progress-analytics-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Design.md first: §4.14 lists earned badges among the calm surfaces; §4.24 describes the compact empty state.
- [x] Earned badge: soft gradient, 1px accent inset, no outer glow, cyan icon; open badge unchanged.
- [x] Amber no longer used for the badge hint (amber stays for rule limits and practice accounts, §1).
- [x] Past months with data unchanged.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, desktop and 390px: earned and open badges side by side, the "Dialled In" hint, empty past months; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `f9c5911`: no hard violations.

- Fixed: the recoloured hint was not in Design.md; §4.14 "Stand" now names it.
- Decision: "tile" is the 38px icon tile. The earned badge card keeps `edge-neon`, which carries a soft outer glow (`--shadow-neon-edge`) like every process card, so earned and open badges stay clearly different. Ask again if the card itself should go calm.
- Open on purpose: Design.md §1 table row ("Verlaufsfüllung, Neon-Rand, Glow-Text") and the §10 Progress paragraph still describe the old badge tile. §10 is history and gets rewritten when the round closes; §1 is outside this ticket's list.
- Open on purpose: the compact empty "Past months" drops the freeze-hint line; it stays in the card with data.
- Verification: "Past months with data unchanged" was not exercised in the browser (no frozen month in the local database); `git diff -w` shows only the early return and the removed ternary wrapper.
