# Workflow and verification

Source of truth for workflow and gates. Approval boundaries are in `../AGENTS.md`;
product and implementation rules belong to their topic documents.

## Working loop

1. Read the active spec `.scratch/<feature>/spec.md` and the current ticket in its
   `issues/`. Goal, Scope, Do not build, Acceptance (with the click path for UI
   changes) and Open questions live there. User approval of a concrete proposal
   authorizes that scope; do not ask again.
2. Work on `feature/<name>` or `fix/<name>`, one branch per spec. Preserve unrelated
   working-tree changes.
3. Implement the agreed scope using existing patterns. Avoid unrelated refactors.
4. Verify using the policy below; fix failures caused by the change. Explain existing
   failures or missing prerequisites rather than claiming a passing gate.
5. Review the diff against the task and applicable product rules. Ask before commit;
   do not commit with failing or incomplete required gates.
6. Use conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`),
   one ticket per commit (a fix without tickets: one fix per commit); apply review
   fixes with `--amend`. Never mention Claude or AI generation in messages.
7. After the review, record findings under `## Review` in the ticket and set
   `Status: done`. Merge only when every ticket and the spec are `Status: done`; ask
   before resolving conflicts or deleting a branch. Durable rationale goes in an ADR
   under `docs/adr/`.

## Verification policy

**Application code, dependencies, build configuration or schema changes:** run these
before asking to commit, in order:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test` (the full suite, not only when domain files change)
4. `pnpm build`
5. Exercise the affected user flows in the browser. State the click path and result;
   if unavailable, mark it pending. For changes with no affected screen, explain why
   browser verification is not applicable. For a width the browser window cannot be
   resized to, open a same-origin page without React (`/api/auth/get-session`) and load
   the app into an iframe of that width; read errors from the iframe's window.

During implementation, use focused checks first. After a correction, rerun affected
checks; the final code must pass the full ordered gate once before commit approval.
Do not repeat successful checks when neither their inputs nor the environment changed.

**Documentation-only changes:** check accuracy against the relevant source, paths,
links, consistency and `git diff --check`; inspect new/untracked files too. Application
lint/typecheck/tests/build and browser checks are not required unless executable code,
configuration or application behaviour also changes. The pre-commit hook skips the
gates when only `*.md` files are staged.

**Database tests:** `../vitest.setup.ts` reads `.env.local`; query tests use real Postgres
and some skip when it is unreachable. For SQL/query/schema changes, relevant DB tests
must execute and pass. Skipped tests are not verification. Report skipped counts and
missing prerequisites; consult `operations.md` before database setup or migrations.

**Domain changes:** include meaningful Vitest coverage in the same commit. Explain
changes to existing assertions in terms of the intended product rule; never weaken
an assertion merely to make a gate pass.

## Review and reporting

- Check money/currency/account multipliers, ownership/auth exceptions, chart-clock
  time, domain rules, SQL aggregation/N+1 and schema/migration pairing as applicable.
- Be concise. Report what changed, why, verification results and any pending checks.
- Ask about unresolved requirements; after 2–3 failed attempts at the same problem,
  stop and explain the evidence. Use current, version-appropriate framework docs
  when local documentation does not answer the question.
