# 03: Reorder steps within a phase

**What to build:** In the Settings checklist template section, a trader can move a step
up or down within its phase. The dashboard's daily checklist shows the same order.
Moving a step to another phase stays delete and re-add.

**Blocked by:** 02 (Tick off the daily checklist on the dashboard).

Status: done

## Acceptance

- [x] Reorder steps within a phase in Settings using controls that work by keyboard;
      reload and verify the order persists.
- [x] The dashboard's daily checklist reflects the new order; today's ticks are
      unaffected by reordering.
- [x] Reordering one phase leaves the other phases unchanged. Another user's item IDs
      cannot be reordered.
- [x] Real Postgres tests through the query module cover reordering, phase isolation
      and ownership.
- [x] Run the required project verification gate. In the browser, reorder in Settings,
      check the dashboard order, including phone width, and inspect the console for new
      errors. Record commands and results.

## Do not build

- Moving steps between phases.
- New dependencies (e.g. a drag-and-drop library) or unrelated refactors.

## Implementation — 2026-10-25

`moveChecklistItem(userId, itemId, "up" | "down")` in the query module swaps an owned
step's position with its neighbour in the same phase. At a phase edge it does nothing.
It takes the same per-user lock as additions (now the shared `lockTemplate` helper),
so moves and adds serialize. The Server Action `moveChecklistStep` revalidates
Settings and the dashboard. In Settings, each row has a `MoveControls` pair of arrow
buttons with labels such as "Move <step> up". The first and last positions are
disabled. While a move is saved, the pressed arrow shows `PendingIndicator` and
`aria-busy`. Afterwards, focus returns to the pressed arrow, or to the other one at an
edge, unless the user has moved focus elsewhere. The dashboard reads the template
order, so it follows without changes. No cross-phase moves, no new dependency.

### Verification

- TDD: the reorder test (swap within a phase, other phase unchanged, today's tick
  stays on the moved step in the dashboard read) failed on the missing function, then
  passed. The edge/gap and cross-user tests passed on the first run, because the
  implementation already covered both. The direction schema test passed on the first
  run, because the schema had been added together with its type.
- `pnpm test src/db/queries/__tests__/checklist.test.ts src/schemas/__tests__/checklist.test.ts`:
  21 passed against real Postgres, no skips.
- Final ordered gate after the review fixes: `pnpm lint` passed (390 files),
  `pnpm typecheck` passed, `pnpm test` passed (79 files, 1335 tests, no skips),
  `pnpm build` passed (exit 0, checked with pipefail).
- Browser (`pnpm dev`, localhost:3000): added synthetic QA steps. Edge arrows were
  disabled (first: up, last: down, single step: both). Ticked a step on the dashboard,
  then moved it in Settings with Enter and Space. The first run lost focus after a
  move (`activeElement` was body); fixed and retested. After the fix, focus stays on
  the pressed arrow and falls back to the other arrow at an edge. The spinner and
  `aria-busy` showed while the move was saved. Reload kept the order. The dashboard
  showed the same order with the tick intact; the other phase was unchanged. At
  390 × 844 (iframe method): no overflow (343px), 44px buttons, moving worked, and the
  dashboard order matched. Console: no errors or warnings. The synthetic steps were
  deleted afterwards and the empty state returned.

## Review

Baseline: HEAD `151bb77`. Two independent axes via the code-review skill.

- Standards P2: the arrows had no loading state (Design.md §9). Fixed with
  `PendingIndicator` and `aria-busy` on the pressed arrow. The arrows stay enabled so
  focus is kept.
- Standards P3: the swap `UPDATE`s now also filter by `userId`. The duplicated
  user-row lock is extracted to `lockTemplate`. The move failure copy is now
  `CHECKLIST_MOVE_FAILED` instead of the save message. The move logic is a separate
  `MoveControls` component (one job per component), with the two arrows mapped from a
  direction list. Focus is no longer pulled back if the user has tabbed away.
- Spec: no findings beyond recording verification here. No scope creep.
- Accepted: no screen-reader announcement of the new position. No documented rule
  requires one; the label and the moved focus carry the context.
- Checkpoint approved by the user with explicit commit authorization.
