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

`preview` is a rehearsal of production, not a second database to keep in sync (ADR 0006).
Before a migration or a data refresh touches it, reset it to production: Neon console
→ Branches → `preview` → Reset from parent. Schema and data then match `main`, the
connection URLs stay the same, and whatever `preview` held before is gone, including
the demo user `local`; log in to a preview with a production account.

A new migration goes to both Neon branches before `main` is pushed: the push deploys
production. `.githooks/pre-push` blocks a push to `main` that adds a migration; push
with `MIGRATIONS_APPLIED=1` once both branches are migrated. Never run `vercel env pull`
— it writes into `.env.local`.

**Renamed prop firm programs.** Renames are decided and applied during the data refresh
(below, steps 4 and 6–8). Applied so far: the renames of 2026-10-22 (rationale in
`decisions.md`), on both Neon branches:

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

## Prop firm data refresh

Monthly, by hand, without any AI subscription: AI may speed up reading the changed
pages, never replace a step (`docs/adr/0005`). It keeps `PropFirmsData.md` and every
database in step with the firms' own pages. A program
missing from the file becomes a discontinued program at the next seed: hidden in the
catalogue, still linkable. Production is run by Sascha, not by an agent.

Work on a branch `chore/prop-firm-refresh-<yyyy-mm>` from `main`, with local Postgres
running and seeded from the current file.

1. **Detect.** `pnpm check:prop-firm-sources` fetches every page in
   `context/prop-firm-sources.md`, saves its text under `context/prop-firm-snapshots/`
   and prints per firm what is `changed`, `new`, `unchanged` or `failed`.
   - Always `failed` (HTTP 403 to non-browser clients, 68 pages): the Tradeify help
     center, the Apex help center API (`apextraderfunding.com/wp-json/…`), the Legends
     knowledge base, the E8 help center and `e8markets.com/futures`, Take Profit
     Trader's Zendesk, `lucidtrading.com`. Open these pages in the browser and read them
     by hand.
   - Stop on any other `failed` source (a 404 or a new error): open it in the browser.
     Moved → put the new official URL in the source list; gone → remove the line. Run
     the step again.
   - Known false change: `myfundedfutures.com/plans/rapid` (live payout ticker). Check
     its diff for anything else.
2. **Read what changed.** `git diff context/prop-firm-snapshots/` shows each changed
   text; `git status` lists the new ones. Read the firm's page itself where the text is
   unclear.
3. **Update `PropFirmsData.md`.** Change only what the firm's own pages say, keep
   conflicts between them as text. Set "Last verified" to today for each firm whose
   pages were all read this month (fetched or by hand); leave it for the others.
4. **Decide renames.** A program the firm sells on under a new name is a program
   rename: note old and new name. A program the firm stopped selling just leaves the
   file and becomes discontinued. Change the name in the file now; the database row is
   renamed in steps 6–8 before each seed, so its links stay.
5. **Check the files.** `pnpm test` (among others it checks that the source list and
   the data file name the same firms) and `git diff --check`. Commit the data file, the
   source list and the snapshots on the branch. Back here after any later change to
   the file, so every database is seeded from the committed state.
6. **Local database.**
   - Apply each rename with a SQL client:

     ```sql
     update prop_firm_programs p
     set name = v.new_name
     from prop_firms f,
       (values ('<firm>', '<old name>', '<new name>')) as v(firm, old_name, new_name)
     where f.id = p.firm_id and f.name = v.firm and p.name = v.old_name;
     ```

   - `pnpm db:compare:propfirms` before seeding: it lists what the seed will change.
     Stop on a program "not in the file: the next seed marks it discontinued" that the
     firm still sells: that is a missing rename, back to step 4.
   - A rename found only after a seed: the old row is now discontinued, a new row
     carries the new name, and linked accounts still point at the old one. Delete the
     new row (`delete from prop_firm_programs where id = <new row id>`; it fails if an
     account is already linked to it, then stop and ask), apply the rename to the old
     row and seed again: it puts the old row back on sale with its links.
   - `pnpm db:seed:propfirms`, then `pnpm db:compare:propfirms` again: it must print
     `Match`. Stop on any difference.
   - `pnpm dev`, open `/prop-firms`: changed programs show their new rules, discontinued
     ones are gone. In Settings → an account → Program, a discontinued program reads
     "— no longer sold".
7. **Neon preview.** Reset `preview` from its parent first, then pending migrations
   (`pnpm db:migrate:preview`, both in Neon and Vercel). Apply the renames in the Neon console's SQL editor on branch `preview`.
   Then compare, seed and compare; check the host the first compare prints before
   seeding:

   ```bash
   node --env-file=.env.local --env-file=.env.neon.preview src/db/compare-propfirms.ts
   node --env-file=.env.local --env-file=.env.neon.preview src/db/seed-propfirms.ts
   node --env-file=.env.local --env-file=.env.neon.preview src/db/compare-propfirms.ts
   ```

   Same stops as step 6; the last run must print `Match`.
8. **Merge and production** (Sascha). Migrate production if a migration is pending
   (Neon and Vercel), merge the branch into `main` and push. Apply the renames on the
   production branch, then:

   ```bash
   node --env-file=.env.local --env-file=.env.neon.production src/db/compare-propfirms.ts
   node --env-file=.env.local --env-file=.env.neon.production src/db/seed-propfirms.ts
   node --env-file=.env.local --env-file=.env.neon.production src/db/compare-propfirms.ts
   ```

   Same stops as step 6; done when the last run prints `Match`.

## Scheduled jobs

- `pnpm job:fx`: retries provisional imported FX amounts after the ECB rate is
  published; the same handler serves the nightly `/api/cron/fx` call.
- `pnpm job:econ`: stores both Forex Factory feed weeks in `econ_events`; the same
  handler serves `/api/cron/econ` daily at 06:00 UTC.
- `pnpm job:month-close`: snapshots the previous month from the user's local 3rd;
  the same handler serves `/api/cron/month-close` daily at 05:00 UTC.

The configured schedules live in `../vercel.json`. Cron handlers authenticate with
`CRON_SECRET` and return no user data; see coding standards → “Visibility”.
