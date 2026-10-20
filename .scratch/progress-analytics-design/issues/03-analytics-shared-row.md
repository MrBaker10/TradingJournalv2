# 03: Analytics — one table row, readable on a phone

**What to build:** Every table on Analytics — the dimensions, the execution sections and
the missed setups — renders its rows through one shared row component, so the row
layout exists once. Below `sm` a row is two lines: the bucket name in full length, then
its figures; the column header becomes one combined label line per card. Desktop looks
as today.

Spec: `.scratch/progress-analytics-design/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Design.md first: §4.16 describes the shared row and its narrow two-line form, and drops the note that the layout lives in several copies.
- [ ] Dimension, execution and missed-setup tables use the shared row; money keeps semantic colour without glow, process values keep neon, hypothetical values stay white (§4.17).
- [ ] "Show all" behaviour and the eight-row limit unchanged.
- [ ] "Past months" on Progress moves onto the shared row only if it fits without a special case; the decision and its reason go under `## Review`.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser, desktop and 390px: a long bucket name (account), "Not set", "Show all", an execution table; no truncated names at 390px, no horizontal scroll, no new console errors.
