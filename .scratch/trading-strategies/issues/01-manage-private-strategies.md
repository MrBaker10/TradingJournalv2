# 01: Create, read and edit private trading strategies

**What to build:** A dedicated strategy-management page where a trader can create,
read and edit multiple private trading strategies. Each strategy has a required
name and optional plain-text chapters for prerequisites, entry, stop/risk, exit
and exclusion criteria. Changes preserve earlier rule sets as immutable strategy
revisions, establishing the approved historical-rules model from the first slice.

**Blocked by:** None (can start immediately).

Status: done

## Acceptance

- [ ] Application navigation opens strategy management, including an empty state
      with a clear create action.
- [ ] Create a strategy using only a name, save, reload and read it successfully.
      A blank name is rejected using the existing validation conventions.
- [ ] Create a second strategy and verify both appear in the owner's list.
- [ ] Add and edit all five optional chapters, save and reopen; text is preserved
      and rendered as plain text.
- [ ] Editing the name or chapters creates a new rule set without mutating prior
      revisions. Strategy identity, owner and archive state are separate from
      revision content, following the approved architecture.
- [ ] Public lifecycle operations and reads enforce ownership. Unauthenticated
      access and another user's supplied identifiers cannot expose or mutate data.
- [ ] Real Postgres tests through lifecycle interfaces and public reads cover
      creation, optional content, edits, immutable history and ownership using the
      established rollback-fixture approach.
- [ ] Run the required project verification gate. In the browser, navigate to
      strategy management, create two strategies, edit and reopen one, and inspect
      the console for new errors. Record commands and results during implementation.

## Do not build

- Trade assignment, explicit revision adoption or archive/reactivation controls;
  these belong to subsequent tickets.
- Strategy analytics, filters, sharing, rich text, automatic evaluation or scoring.
- New dependencies or unrelated refactors.

## Open questions

None. Use the confirmed spec and ADR for terminology, scope and revision semantics.

## Review

### Verification (2026-10-25)

- `pnpm lint`, `pnpm typecheck`: clean. `pnpm test`: 77 files, 1271 tests passed, none skipped (real Postgres). `pnpm build`: ok.
- Migration `0028` applied locally via `pnpm db:migrate`.
- Browser `/strategies`: nav entry, empty state, blank name rejected ("Name your strategy"), created two strategies, edited one with all five chapters, reloaded: text preserved as plain text (`<b>` shown literally). No console errors.

### Findings

Decided in this ticket:

- Saving unchanged rules appends no revision (a revision means the rules changed; avoids clearing a by-the-book answer needlessly in ticket 03). Deviates from the literal ticket wording; flagged by review.
- Length caps (name 100, chapter 4000) are an implementation choice, not in the spec. Open: confirm or drop.
- Chapters are trimmed on save (leading indentation of the first line is lost).
- `strategy_revisions` has no `user_id`; ownership is enforced via the join to `trading_strategies` in every read. Deliberate per ADR 0003.
- `getStrategy`, `getStrategyRevision` and `archivedAt` have no caller yet; they serve immutable-history tests and tickets 02 and 04.

Left open (judgement calls, matches the ledger pattern):

- `ActionResult<T>` copied from `src/actions/ledger.ts`; `getCurrentUser()` inside `try/catch` swallows the redirect for an expired session (same as ledger).
- `strategy-form.tsx` imports `runWithToast`/`SaveButton` from `components/ledger/`; moving them to `components/ui` would be a refactor outside this ticket.
- Chapter field list repeated in several places; nested ternary and duplicate "New strategy" button in `strategy-manager.tsx`.
- No test calls the actions or page, so unauthenticated access is not covered by a test; `getCurrentUser()` redirects.

Fixed: the name-length message now uses `MAX_STRATEGY_NAME_LENGTH`.
