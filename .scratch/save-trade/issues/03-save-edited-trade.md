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

**Status:** ready-for-agent

- [ ] The save module's interface takes an optional trade id; the update action calls it and keeps only parsing, the user lookup, badges and refresh.
- [ ] DB test: editing another user's trade or a deleted trade fails with "Trade not found".
- [ ] DB test: an archived account the trade already sits on stays; an archived account it was not on is rejected.
- [ ] DB test: an edit replaces tags and accounts instead of adding.
- [ ] DB test: unchanged instrument and contracts keep the stored commission; a changed contract count recomputes a rate-based one.
- [ ] DB test: no commission is added while the P&L is still an import file's own.
- [ ] DB test: import marks on untouched values stay; a changed stop or P&L clears its mark.
- [ ] Full gate; browser check: edit a trade's prices and see the new P&L; save an imported trade unchanged and confirm its batch can still be undone; untick a tag and see it gone.
