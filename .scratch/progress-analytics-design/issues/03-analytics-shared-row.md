# 03: Analytics — one table row, readable on a phone

**What to build:** Every table on Analytics — the dimensions, the execution sections and
the missed setups — renders its rows through one shared row component, so the row
layout exists once. Below `sm` a row is two lines: the bucket name in full length, then
its figures; the column header becomes one combined label line per card. Desktop looks
as today.

Spec: `.scratch/progress-analytics-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Design.md first: §4.16 describes the shared row and its narrow two-line form, and drops the note that the layout lives in several copies.
- [x] Dimension, execution and missed-setup tables use the shared row; money keeps semantic colour without glow, process values keep neon, hypothetical values stay white (§4.17).
- [x] "Show all" behaviour and the eight-row limit unchanged.
- [x] "Past months" on Progress moves onto the shared row only if it fits without a special case; the decision and its reason go under `## Review`.
- [x] Gates from `context/ai-interaction.md`.
- [x] Browser, desktop and 390px: a long bucket name (account), "Not set", "Show all", an execution table; no truncated names at 390px, no horizontal scroll, no new console errors.

## Review

Standards and spec review on 2026-10-21 against `6ed91bf`: no hard violations.

- Past months on Progress stays its own row. Below `sm` it shows only month and score and drops the four parts, while the shared row shows every figure on a second line; supporting both would put a special case into the component for one caller. Reason documented in Design.md §4.16 and §4.24.
- The import preview table (§4.18) was outside the ticket and stays a separate copy; §4.18 and §4.16 now say so.
- Fixed: Design.md named three execution sections as users of the component; it is Hold time and Risk calibration (Exit efficiency has no rows).
- Decision: Risk calibration had no header before, so none was added (desktop stays as today). Its narrow rows carry no label line; documented in §4.16.
- Open on purpose: `BucketRow` pairs `columns` and `cells` by index, and `columns[].label` is the React key, so labels must be unique per table. `tone` and `width` are raw Tailwind classes; `width` carries the `sm:` prefix so Tailwind sees the literal.
- Open on purpose: the narrow `·` separators are `aria-hidden` and the narrow label line is one joined string, so a screen reader gets figures without per-cell labels at that width. Desktop has no cell-to-column association either.
- Verification: the long bucket name at 390px was a DOM edit, not real data; Risk calibration and Missed setups rows with data were not exercised (no excursion or missed data locally) but use the same component.
