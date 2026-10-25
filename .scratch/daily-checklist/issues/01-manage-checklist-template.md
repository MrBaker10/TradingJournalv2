# 01: Manage the checklist template in Settings

**What to build:** A checklist template section in Settings where a trader maintains
their routine steps in three fixed phases — pre-market, trading and day review. Steps
can be added, renamed and deleted. Limits are enforced on the server and reported at
the field. This slice establishes the template as user-owned data; the dashboard and
reordering follow in later tickets.

**Blocked by:** None (can start immediately).

Status: done

## Acceptance

- [x] Settings shows a checklist template section with all three phases, each with an
      empty state and an add action.
- [x] Add steps to every phase, rename one and delete one; reload and verify the
      template is persisted in insertion order per phase.
- [x] Text is trimmed; empty text and text over 120 characters are rejected with a
      message at the field. A 21st step in a phase is rejected with a clear message.
- [x] Template reads and writes are owned by the user: another user's supplied item
      IDs can neither be read, renamed nor deleted. Deleting a user deletes their
      template.
- [x] Real Postgres tests through the new query module cover add, rename, delete,
      limits, ownership and cascade using the established rollback-fixture approach
      (prior art: weekly-reviews and strategies query tests).
- [x] Run the required project verification gate. In the browser, edit the template
      in Settings, including phone width and keyboard use, and inspect the console for
      new errors. Record commands and results during implementation.

## Do not build

- The dashboard card, ticking or daily checks; these belong to ticket 02.
- Reordering; this belongs to ticket 03.
- Example or preset steps, multiple templates, links to strategies or trades.
- New dependencies or unrelated refactors.

## Implementation — 2026-10-25

Implemented the user-owned template table and generated migration 0030, query
module, shared Zod inputs, authenticated Server Actions and Settings section.
Additions lock the user row before counting and assigning a position, so concurrent
requests cannot exceed the phase limit. No daily checks or reordering in this ticket.

### Verification

- TDD: initial query test failed on the missing module; phase-limit test failed
  because the 21st insert succeeded; rename/delete test failed on the missing
  function. Each slice passed after implementation.
- `pnpm db:generate`: passed; `pnpm db:migrate`: passed with local database access
  outside the sandbox. Initial sandbox migration/test calls could not access Postgres.
- `pnpm test src/db/queries/__tests__/checklist.test.ts`: 9 passed against real
  Postgres, no skips. Rollback fixtures cover order, trimming, add/rename/delete,
  phase limit, ownership, text boundaries and user cascade.
- Final ordered checks after the review correction: `pnpm lint` passed (388 files),
  `pnpm typecheck` passed, `pnpm test` passed (79 files, 1326 tests, no skips).
- `pnpm build`: passed in the user's local terminal (exit 0, 3.15 seconds),
  including compilation, TypeScript and page generation. Earlier agent runs
  failed on an environment permission restriction while binding a local port;
  the successful local run resolves the outstanding build verification.
- Browser: Settings → Checklist template. Verified three empty phases, added a
  synthetic step to every phase, renamed via keyboard, added another pre-market
  step, deleted the review step, reloaded and verified persisted insertion order
  and deletion. Empty text and 121 characters show inline errors. At 390 × 844,
  add/delete and Tab/Enter work; the checklist sections have no horizontal overflow
  (343px client/scroll width). The overall page has pre-existing overflow outside
  this section. Console returned no warnings/errors. Temporary viewport reset and
  synthetic QA steps removed. Phase-limit rejection is covered by Postgres tests.
- Browser automation was briefly blocked by another extension's UI; resumed after
  the user dismissed it.

## Review

Baseline: initial clean HEAD `b679af37962c860b0534b299bbc24c744ce1763a`, including
all new untracked files. Two independent review axes via the code-review skill.

- Standards: one P2 finding — saving/deleting labels changed button width. Fixed
  with overlapping grid labels that reserve both widths; reviewer verified the fix.
  No remaining standards findings.
- Spec: no code findings or scope creep. All required verification is complete.
- Checkpoint approved by the user with explicit commit authorization after the
  successful local build. No next-ticket work was performed.
