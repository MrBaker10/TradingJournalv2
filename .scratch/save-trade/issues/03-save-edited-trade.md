# 03: Save an edited trade through the save module

**What to build:** Editing a trade works exactly as today, now through the same save
module, called with the id of the trade to edit. The update action shrinks to the same
thin shape as the create action and also refreshes the edited trade's page. The edit
path adds what only an edit needs: the owned-trade lookup, the archive rule that keeps
an archived account the trade already sits on, replacing tags and accounts, keeping or
recomputing stored commissions, and the import marks after an edit. Links stay managed
by their own actions, as today.

Spec: `.scratch/save-trade/spec.md`. Terms: `GLOSSARY.md` → Trade, Account, Import batch.

**Blocked by:** 02

**Status:** done

- [x] The save module's interface takes an optional trade id; the update action calls it and keeps only parsing, the user lookup, badges and refresh.
- [x] DB test: editing another user's trade or a deleted trade fails with "Trade not found".
- [x] DB test: an archived account the trade already sits on stays; an archived account it was not on is rejected.
- [x] DB test: an edit replaces tags and accounts instead of adding.
- [x] DB test: unchanged instrument and contracts keep the stored commission; a changed contract count recomputes a rate-based one.
- [x] DB test: no commission is added while the P&L is still an import file's own.
- [x] DB test: import marks on untouched values stay; a changed stop or P&L clears its mark.
- [x] Full gate; browser check: edit a trade's prices and see the new P&L; save an imported trade unchanged and confirm its batch can still be undone; untick a tag and see it gone.

## Review

Review of `84d62da`, two axes (Standards, Spec). Spec: nothing missing, no scope
creep, no drift from the old `updateTrade` (order of checks, messages, transaction
boundary, archive and commission rules, links on create only, revalidation, badges
after the commit). The `id` in `updateTrade`'s result is the spec's return shape.

- **Fixed:**
  - `saveTrade` had grown to 105 lines and decided create versus edit in six
    places. What only an edit needs (stored commissions, basis change, P&L from a
    file, the import marks) now comes from `editContextFor`, and `writeTrade`
    inserts or replaces inside the transaction. `saveTrade` is 83 lines, and the
    replace path takes the marks from a non-null `edit`, so they are no longer
    null only by implication.
  - `checkedAccountIds` renamed `assignableAccountIds`.
  - Tests: the edit options come from `editOf`, and the edit helpers sit at module
    level next to `createdTradeId`.
  - After the refactor, four mutations each turned exactly their test red again:
    create's archive rule on edit, marks not written, contract count never
    compared, P&L never from a file.
- **Left open on purpose:**
  - `saveTrade` is still above "under 50 lines where possible"; what is left is
    the check sequence and wrapped argument lists.
  - `Number(existing.contracts)` in the basis check: a comparison, moved verbatim,
    in line with the open `number` item from ticket 02. The missing `try/catch` in
    the actions also stays open from ticket 02.
  - "A deleted trade" is covered because trades are hard-deleted; `getOwnedTrade`
    has no soft-delete filter, as before.
  - An edit of a missed setup now reads the stored commissions too (one extra
    query, result unused); kept for one edit context instead of another branch.
