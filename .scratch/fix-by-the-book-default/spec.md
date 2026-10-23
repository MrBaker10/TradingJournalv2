# Spec: Preserve an unanswered by-the-book review

Status: done

## Goal

Saving a trade without answering "By the book" preserves an empty value, so an
unchanged imported trade remains removable through its import batch's undo.
Terms: `GLOSSARY.md` → Trade, Taken trade, Missed setup, Import batch.

## Scope

- Replace the by-the-book switch in the shared create/edit form with the existing
  optional-select pattern: `—`, `Yes`, `No`.
- `—` means unanswered and stores `null`; Yes stores `true`; No stores `false`.
- New trades start unanswered. Edits preserve the stored answer, including empty.
- The trader can clear a previous answer by selecting `—` again.
- Keep the existing shared validation and save interface; omit an unanswered
  by-the-book value from the form payload, as for other optional fields.

## Do not build

No schema changes, dependencies, data backfill, changes to import-undo rules,
consistency scoring, badges, other review fields or the shared toggle component.
Missed setups keep their existing behaviour.

## Acceptance

- Reproduce the unchanged imported-trade save before fixing the form.
- Journal → imported trade → Edit → Save without changes → Import → Past imports:
  the removable and total counts remain unchanged after the fix.
- New trade → Review: By the book starts at `—`; saving keeps it unanswered.
- Edit → select Yes or No → Save → Edit: the selected answer persists.
- Edit → select `—` → Save → Edit: the answer is empty again.
- Verify the browser console, the focused tests and the full project gate.

## Testing decisions

Confirmed by the user in this conversation:

- Browser boundary: the rendered create/edit form through the real save action to
  the persisted answer and the import batch's removable count. This catches the
  original form-state bug; storage-only tests cannot catch it.
- Existing `saveTrade` boundary: database tests for unanswered, Yes and No on create
  and edit, using rollback fixtures and public read interfaces. These pin the
  storage contract without pretending to cover the form.

## Open questions

None. The user approved the three-option select and both test boundaries.
