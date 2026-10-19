# 05: Edit and delete entries

**What to build:** The user can edit an entry (kind, category, date, amount, account,
note) with an explicit save, and delete an entry after a confirmation. Another user's
entry can be neither changed nor deleted. An entry already tied to an account that was
archived keeps it on edit; a new or changed assignment must be to a real, non-archived
account.

Spec: `.scratch/ledger/spec.md`. Terms: `GLOSSARY.md`.

**Blocked by:** 02 (Tie an entry to a real account)

**Status:** ready-for-agent

- [ ] Query module `ledger`: update and delete, filtered by the current user.
- [ ] Server actions with `getCurrentUser()`, Zod schema for update, explicit save.
- [ ] Account check on update: unchanged archived assignment allowed; new or changed assignment owned, real and not archived.
- [ ] Delete only after a confirmation step.
- [ ] DB tests (executed): update/delete for the owner; another user's entry cannot be updated or deleted; changing to a practice, foreign or archived account rejected; category rules hold on update.
- [ ] Gates from `context/ai-interaction.md`.
- [ ] Browser: edit an entry and save; cancel a delete; confirm a delete; list and totals update; no new console errors.
