# 01: Saving a trade unchanged leaves "by the book" empty

**What is broken:** Saving an imported trade in the edit form without changing anything
makes it count as worked on, so its import batch can no longer undo it. The form turns
an empty `by_the_book` into `false` (`src/components/trades/trade-form.tsx`, initial
state `trade.byTheBook ?? false`) and always submits it; the save stores `false`, and
the undo check counts `by_the_book is not null` as touched
(`src/db/queries/import.ts`, `TOUCHED`). The same happens to any taken trade logged
or edited by hand: "not answered" is saved as "not by the book".

Found during the browser check of `.scratch/save-trade/issues/03-save-edited-trade.md`
on 2026-10-23: saving trade 14660 unchanged moved its batch from "Remove 59 of 59" to
"Remove 58 of 59". The value was reset by hand afterwards. Same behaviour on `main`;
not caused by the save-trade refactor.

Terms: `GLOSSARY.md` → Trade, Import batch.

**Blocked by:** None

**Status:** done

Spec: `../spec.md`.

**Decision:** The user approved replacing the switch with `— / Yes / No` in both
create and edit. An unanswered value stays empty; a previous answer can be cleared.
Browser checks and database tests through `saveTrade` are the approved boundaries.

- [x] Repro test first: saving an imported trade unchanged keeps it removable by undo.
- [x] An untouched "by the book" is stored as empty, on create and on edit.
- [x] Full gate; browser check: save an imported trade unchanged and see its batch count stay.

Verification: `../verification.md`. All required checks passed. The initial
Turbopack port error was retained in its persistent build cache; archiving the
generated cache and running `pnpm build` outside the sandbox succeeded.

## Review

Two independent reviews of the working-tree changes against
`e682788fcf6f19a1ab11bbb2beece0ac54558d01`; reviewed before committing.

- **Standards:** no findings. The existing field, validation, accessibility and
  rollback-test patterns are followed; no new abstraction is needed.
- **Spec:** no implementation findings or scope creep. The browser regression
  catches the original form defect, while the database tests cover the storage
  contract. New-trade persistence was verified at the `saveTrade` boundary; its
  default was inspected in the browser without adding an extra journal entry.
- **Verification complete:** lint, typecheck, all 1257 tests, build and the affected
  browser flows passed. The user approved the checkpoint and requested commit,
  merge to main, push and deletion of the fix branch.
