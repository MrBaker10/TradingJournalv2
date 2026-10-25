# AGENTS.md

**Trading-Journal:** a private trade journal for prop-firm traders. Reward consistent
journaling, never profit. Next.js App Router, React, TypeScript, PostgreSQL, Drizzle,
Tailwind and Better Auth. Installed versions and runnable scripts: `package.json`;
version policy and framework patterns: `context/coding-standards.md`.

## Scope and approval

- Ask about open product rules, conflicting requirements or work outside the agreed
  scope. Resolve implementation details from established patterns and tests; do not
  invent product decisions. Preserve unrelated changes in the working tree.
- Respect “Do not build” in the active spec `.scratch/<feature>/spec.md` and
  `context/project-overview.md` → “Not Building”.
- Ask before commits, new dependencies, version changes, large refactors,
  architectural changes, file/branch deletion or resolving merge conflicts.
- Never access the separate Laravel/Inertia journal: no reading, copying, migration
  or modification. Only the provided screenshots and `context/PropFirmsData.md` carry over.
- Never run `vercel env pull`; it overwrites `.env.local`.

## Read only what the task needs

Before implementation, read the active spec and ticket under `.scratch/<feature>/` and
the workflow in `context/ai-interaction.md`. For reviews or questions, read only relevant sources.
Search headings/symbols first and read the matching sections with enough surrounding
context. Do not load entire reference files or histories by default, or reread
unchanged text already available in the conversation.

| Task | Additional source of truth |
|---|---|
| Product behaviour, scope, open decisions | Relevant sections of `context/project-overview.md` |
| Locate modules or understand boundaries | `context/project-structure.md` |
| Code changes | Relevant sections of `context/coding-standards.md` and nearby code/tests |
| UI | `context/Design.md`: principles, relevant tokens/component, motion and accessibility |
| Money, accounts, time, SQL | Product rules + coding standards for money/time/database + affected domain/query tests |
| Prop firm rules or seeder | `context/PropFirmsData.md` |
| Migrations, seeds, deployment, cron operations | `context/operations.md` |
| Earlier rationale or completed work | `docs/adr/` and `.scratch/<feature>/`; for work before 2026-10-23 search the archived `context/decisions.md` or `context/history.md`; read matches only |

Each source owns its topic: product rules in the overview, technical patterns in
coding standards, visuals in Design, workflow/gates in ai-interaction. Package.json
records installed versions/scripts; a planned pin does not authorize installation.
Report contradictions; do not silently pick a rule or change product behaviour.
Historical notes do not override current specifications. Decisions are append-only.

## Product invariants

- **Money:** Postgres `numeric`, integer minor units in domain logic. No `number`
  arithmetic on prices, points, P&L or R. Use existing money helpers.
- **Currency:** price-derived P&L settles in `instruments.profit_currency`; convert
  with the trade-date ECB rate. The P&L override is already USD.
- **Accounts:** multiply money by assigned real-account count exactly once, never
  counts. Use `src/domain/accounts.ts` and `src/db/queries/scope.ts`.
- **Practice:** exclude from all combined figures, including progress. Practice data
  is visible through explicit single-account selection; do not infer practice by name.
- **Missed setups:** `trades.taken = false`; feed streak/badges, never P&L, win rate or R.
- **Time:** stored entry/exit times are chart-clock `time without time zone`; never
  apply `users.timezone` to them. Imports convert broker time once at the file boundary.
  Econ events and audit timestamps are timezone-aware.
- **Ownership:** application user data stays behind a session and is filtered by
  current user. Verify client-supplied IDs. Use `getCurrentUser()` in application
  pages/actions/handlers; components and queries must not read sessions directly.
  No sharing, public journal, read-only sharing, leaderboard or raffle.
- **Auth exceptions:** see `context/coding-standards.md` → “Visibility” for the exact
  route exceptions and their protections. Do not broaden them implicitly.
- **Links:** HTTPS anchors only; never fetch a user-supplied URL server-side or embed
  an iframe. Browser-loaded preview images may be derived by the pure string rule
  `snapshotImageUrl` in `src/lib/links.ts` (Design §4.13).
- **Domain:** `src/domain/**` is pure, with no DB or `next/*` imports. Ship Vitest
  coverage with domain changes. Aggregate in SQL, not TypeScript.
- **Accounts with trades:** archive rather than hard-delete. A trade has ≥1 account.
- **UI:** dark only. Money gets semantic colour, no glow or celebration. Process
  values may glow; selected practice accounts retain the amber edge stripe.
  Keep `<MotionConfig reducedMotion="user">` at the root.
- **Econ:** read `econ_events` at request time; feed fetch/parse stays in `src/lib/econ/`.

## Work and verification

Follow `context/ai-interaction.md` for the branch/spec/commit workflow and the single
verification policy, including documentation-only changes and skipped DB tests.
Use scripts from `package.json`; `pnpm dev` starts the app. Do not assume an E2E
script exists. Read operations instructions before database or deployment commands.
Use generated migrations, never `drizzle-kit push`. Do not enable `cacheComponents`.
After 2–3 failed attempts at the same problem, stop and explain the evidence.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
