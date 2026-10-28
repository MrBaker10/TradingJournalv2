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

Local Postgres: host, port and version come from `.env.local`, which differs per
machine (macOS: DBngin, PostgreSQL 18.4 on `localhost:5432`; Windows/WSL: Docker
container `pg-tradingjournal`, 18.6 on `localhost:5433`); start it before `pnpm test` or a
commit, since the pre-commit hook runs the DB tests. After restoring a dump, run
`vacuumdb --analyze-only`: `pg_restore` leaves no planner statistics and the DB tests
time out without them.

Generate schema migrations with `pnpm db:generate`, apply with `pnpm db:migrate`;
never use `push`. Keep schema and generated migration in the same commit.

Demo data: `pnpm db:seed:demo` deletes and recreates the user `demo` with about four
months of made-up journal data (accounts incl. practice and archived, trades, missed
setups, notes, checklist, weekly reviews, ledger, closed months, badges). It needs
`DEMO_USER_PASSWORD` plus the instrument, trade-tag, prop-firm and badge seeds. Test
data never goes into a migration.

It refuses any host but localhost unless `--allow-host` names exactly the host of
`DATABASE_URL`. On such a host an existing `demo` user stops the run with its id,
creation date and entry count, because a real person may have registered that name;
add `--replace` only once that is checked. Against Neon production it is run by
Sascha, not by an agent. A password set in the shell wins over `.env.local`, so
production gets its own:

```bash
read -rs DEMO_USER_PASSWORD && export DEMO_USER_PASSWORD
node --env-file=.env.local --env-file=.env.neon.production src/db/seed-demo.ts \
  --allow-host <host of DATABASE_URL in .env.neon.production>
```

On a machine without `.env.neon.production`, read the pooled production connection
string from the Neon console into the shell instead (`read -rs DATABASE_URL && export
DATABASE_URL`) and leave out the second `--env-file`: a variable set in the shell
wins over the file. Dates are relative to the day of the run; run it again (with `--replace`) to bring the
history up to date. Visitors with the password can journal on it, but cannot change
its password or two-factor, delete it, sign other sessions out or upload screenshots
(`coding-standards.md` → "Visibility"); anything else they change stays until the next
`--replace`.

## Neon and Vercel

**Neon (P2.2).** Production runs on Neon `tradingjournal` (aws-eu-central-1, PG 18),
Vercel functions in `fra1`. Only `main` deploys on push (`vercel.json` →
`git.deploymentEnabled`); other branches get no automatic preview. A preview deployed
by hand uses the Neon branch `preview`. The Neon URLs live
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

**Renamed prop firm programs.** The prop firm seeder keys programs on firm and name and
never deletes, so a renamed program would come back as a second row. Rename the existing
row in place before seeding; its id, and every account linked to it, stays. Before
running `seed-propfirms.ts` against a Neon branch, check that no rename from this section
is still pending there; a seed run first leaves the old row beside the new one, and only
a manual delete removes it. Production is run by Sascha, not by an agent. The renames of
2026-10-22 (rationale in `decisions.md`) are applied on both Neon branches:

```sql
update prop_firm_programs p
set name = v.new_name
from prop_firms f,
  (values
    ('Goat Funded Futures', '50k EOD', 'EOD 50k'),
    ('Legends Trading', 'Elite Master 50k', '50k Elite'),
    ('E8 Markets', 'Signature Futures 50k', 'E8 Signature 50k'),
    ('TradeDay', '50k EOD', 'Quick Pay EOD 50k')
  ) as v(firm, old_name, new_name)
where f.id = p.firm_id and f.name = v.firm and p.name = v.old_name;
```

## Scheduled jobs

- `pnpm job:fx`: retries provisional imported FX amounts after the ECB rate is
  published; the same handler serves the nightly `/api/cron/fx` call.
- `pnpm job:econ`: stores both Forex Factory feed weeks in `econ_events`; the same
  handler serves `/api/cron/econ` daily at 06:00 UTC.
- `pnpm job:month-close`: snapshots the previous month from the user's local 3rd;
  the same handler serves `/api/cron/month-close` daily at 05:00 UTC.

The configured schedules live in `../vercel.json`. Cron handlers authenticate with
`CRON_SECRET` and return no user data; see coding standards → “Visibility”.
