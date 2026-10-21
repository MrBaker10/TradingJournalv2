# 01: Trade row with a clear hierarchy

**What to build:** Every trade row, in the journal and in "Recent trades" on the
dashboard, reads with a clear hierarchy. The title line shows the symbol and the
direction as muted text (`MNQ · Short`). Chips remain only for missed, grade and the
confluence count; the win/loss chip is gone, so the amount's colour and R are the only
result signal. Below `sm` the title line shows only symbol, direction and the missed
chip; every row stays two lines high and the amount is never cut off. Missed setups stay
built exactly like taken trades apart from the tile colour and the missed chip.

Spec: `.scratch/journal-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Design.md first: §4.9 describes the new title line, the chips that remain, the removed result chip (gross label beside a net amount) and the narrow-screen form.
- [x] Direction as text after the symbol, not a chip; result chip removed.
- [x] Grade and confluence count hidden below `sm`; missed chip always visible.
- [x] Amount and R column unchanged; would-be R for missed setups unchanged.
- [x] Meta line unchanged in this ticket (date first).
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, desktop and 390px, journal and dashboard "Recent trades": taken win, taken loss, missed setup, a row with grade and confluences, a long CFD symbol; no horizontal scroll; no new console errors.

## Review

Standards and spec review on 2026-10-21 against `7695be7` (uncommitted diff).

- Fixed: Design.md §8 still named `win`/`loss` as tag text; it now names the sign on amount and R as the text carrier and `missed` as the tag.
- Fixed: the direction sat inside the truncating symbol span, so a long symbol cut the direction first. It is now its own `shrink-0` span; only the symbol truncates, and §4.9 says so.
- Fixed: the tag class string repeated three times; a row-local `Tag` with `fromSm` replaces it (pattern of the local `Tag` in the trade detail).
- Fixed: header comment reflowed; the inline comment points to §4.9 instead of repeating it.
- Open on purpose: the `long`/`short` label mapping also lives in trade detail and trade form; this ticket only moved it, a shared helper would be a refactor outside scope.
- Not a finding: hiding grade and confluence count below `sm` is specified in §4.9; §9 L10 is about form labels.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (1159 passed), `pnpm build` all exit 0. Browser: `/journal` desktop; iframe at 390 (`/journal`), 640 (`/journal`, `/dashboard`), 800 and 1024 (`/dashboard`) with a missed row's symbol replaced by `GER40.cash.longer.symbol` — rows 62px, direction "· Long" fully visible, symbol truncated, amount inside the row, tags only MISSED at 390 and MISSED/GRADE/CONFLUENCE from 640, no horizontal scroll; no console errors on `/journal` and `/dashboard`.
