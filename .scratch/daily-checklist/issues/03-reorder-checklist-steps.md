# 03: Reorder steps within a phase

**What to build:** In the Settings checklist template section, a trader can move a step
up or down within its phase. The dashboard's daily checklist shows the same order.
Moving a step to another phase stays delete and re-add.

**Blocked by:** 02 (Tick off the daily checklist on the dashboard).

Status: ready-for-agent

## Acceptance

- [ ] Reorder steps within a phase in Settings using controls that work by keyboard;
      reload and verify the order persists.
- [ ] The dashboard's daily checklist reflects the new order; today's ticks are
      unaffected by reordering.
- [ ] Reordering one phase leaves the other phases unchanged. Another user's item IDs
      cannot be reordered.
- [ ] Real Postgres tests through the query module cover reordering, phase isolation
      and ownership.
- [ ] Run the required project verification gate. In the browser, reorder in Settings,
      check the dashboard order, including phone width, and inspect the console for new
      errors. Record commands and results.

## Do not build

- Moving steps between phases.
- New dependencies (e.g. a drag-and-drop library) or unrelated refactors.
