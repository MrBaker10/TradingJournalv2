# Database and deployment operations

Read before migrations, seeds, deployment or cron operations. Runnable commands are
in `../package.json`; installed pins and migration patterns are in
`coding-standards.md`. Verification and approval follow `ai-interaction.md` and
`../AGENTS.md`.

## Local database and tests

The `db:*` and `job:*` scripts load `.env.local`. Vitest loads the same file through
`../vitest.setup.ts`; DB-dependent tests need reachable Postgres and the schema/seed
required by their fixtures. Check prerequisites in the affected tests. Do not treat
skipped DB tests as passing coverage.

Generate schema migrations with `pnpm db:generate`, apply with `pnpm db:migrate`;
never use `push`. Keep schema and generated migration in the same commit.

## Neon and Vercel

**Neon (P2.2).** Production runs on Neon `tradingjournal` (aws-eu-central-1, PG 18),
Vercel functions in `fra1`. Previews use the Neon branch `preview`. The Neon URLs live
in the gitignored `.env.neon.production` and `.env.neon.preview` (`DATABASE_URL` pooled,
`DATABASE_URL_DIRECT` direct). The `db:*` scripts only read `.env.local`; against Neon,
load the Neon file second so it wins, and check the host first:

```bash
pnpm db:migrate:preview      # Neon branch preview
pnpm db:migrate:production   # Neon production — run by Sascha, not by an agent
node --env-file=.env.local --env-file=.env.neon.production src/db/seed-propfirms.ts
```

A new migration goes to both Neon branches before `main` is pushed: the push deploys
production. `.githooks/pre-push` blocks a push to `main` that adds a migration; push
with `MIGRATIONS_APPLIED=1` once both branches are migrated. Never run `vercel env pull`
— it writes into `.env.local`.

## Scheduled jobs

- `pnpm job:fx`: retries provisional imported FX amounts after the ECB rate is
  published; the same handler serves the nightly `/api/cron/fx` call.
- `pnpm job:econ`: stores both Forex Factory feed weeks in `econ_events`; the same
  handler serves `/api/cron/econ` daily at 06:00 UTC.
- `pnpm job:month-close`: snapshots the previous month from the user's local 3rd;
  the same handler serves `/api/cron/month-close` daily at 05:00 UTC.

The configured schedules live in `../vercel.json`. Cron handlers authenticate with
`CRON_SECRET` and return no user data; see coding standards → “Visibility”.
