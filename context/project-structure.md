# Project Structure

**Trading-Journal.** A journaling tool for prop-firm futures
traders. It rewards consistent logging, not profit: streaks, a consistency score,
badges are earned by journaling, never by P&L.

Single owner per journal. Nothing is shared, published or ranked. Each user keeps
several self-named accounts (demo, evaluation, backtest, live) in one journal.

## Modules

| Route | Module | Core job |
|---|---|---|
| `/dashboard` | Dashboard | KPI cards, streak, pre-market plan, end-of-day review, P&L calendar, recent trades |
| `/journal` | Trade Journal | List with filters incl. account, expandable rows, new trade, missed setup, CSV import |
| `/analytics` | Analytics | Eleven dimensions incl. account, hold time, risk calibration, exit efficiency, missed setups |
| `/progress` | Progress | Streak rules, consistency score, 12 badges |
| `/prop-firms` | Prop Firm Rules | ~15 firms, 18 rule fields each, search, filter chips, compare |
| `/econ-calendar` | Econ Calendar (**Phase 2**) | This week / next week, high-impact filter, user's timezone |
| `/settings` | Settings | Profile, accounts, password, 2FA, timezone, currency, danger zone |

## Directory layout

```
src/
  app/
    (app)/                    # authenticated shell: sidebar + main
      dashboard/
      journal/
        import/
      analytics/
      progress/
      prop-firms/
      econ-calendar/          # Phase 2
      settings/
    api/
      cron/
        fx/route.ts           # daily ECB rates via frankfurter
        econ/route.ts         # Phase 2 — econ calendar sync (Forex Factory weekly JSON)
        month-close/route.ts  # monthly consistency score snapshot
      uploads/route.ts        # signed URLs for screenshots
      export/trades/route.ts  # whole-journal CSV download
    globals.css               # Tailwind v4 @theme lives here
  components/
    ui/                       # shadcn primitives
    dashboard/  journal/  analytics/  progress/  import/
    prop-firms/  econ/  settings/    # econ/ is Phase 2
  domain/                     # pure, tested, no DB
    pnl.ts
    accounts.ts               # assignment rules, per-account vs combined, multipliers
    streak.ts
    consistency.ts
    badges.ts
    import/
      types.ts                # the shapes every import module passes around
      detect.ts               # round-trip vs fills vs TradingView (fills only, so far)
      normalize.ts            # UTC -> the trader's clock, symbol -> instrument, tick
      fills.ts                # FIFO pairing per contract
      match.ts                # tier 1 broker key, tier 2 entry side
      outcome.ts              # skip / update / new, and what an update may write
      session.ts              # NY windows, read on the trader's clock
  db/
    schema/                   # one file per area
    queries/                  # one file per area
    migrations/
    index.ts                  # client
    seed.ts                   # local user + default account
    seed-instruments.ts       # ten futures plus MGC
    seed-propfirms.ts         # idempotent upsert from PropFirmsData.md
  actions/                    # server actions, one file per feature
  schemas/                    # Zod, shared with forms
  lib/
    auth/                     # getCurrentUser() seam
    storage/                  # local disk | S3-compatible seam
    csv/                      # RFC 4180 writer + reader, and the export row shape
    fx/                       # rate fetch + display conversion
    econ/                     # Phase 2 — feed adapter, swappable in one file
    money.ts  time.ts  env.ts
  hooks/
  types/
context/
  project-structure.md  coding-standards.md  ai-interaction.md  current-feature.md
  PropFirmsData.md
```

## Data model

`users`, `accounts`, `trade_accounts`, `instruments`, `trades`, `confluence_tags`,
`trade_confluences`,
`mistake_tags`, `trade_mistakes`, `trade_screenshots`, `trade_links`, `daily_notes`,
`import_batches`, `badge_defs`, `user_badges`, `monthly_scores`,
`prop_firms`, `prop_firm_programs`, `econ_events`,
`fx_rates`

Two decisions worth stating once:

- A missed setup is `trades.taken = false`, not a second table. It feeds streak and
  badges, and is excluded from every P&L, win rate and R figure.
- Accounts are a relation, not a number. `trade_accounts` replaces the old numeric
  copy-trading multiplier, so one trade can belong to several accounts and every
  figure can be filtered by account. A trade always has at least one account.
- A practice account is `accounts.is_practice = true`, set by a toggle, not a name
  match. Nothing is ever inferred from what an account is called.
- Confluences use a join table, not a JSON column, because "By confluence" in
  Analytics is a real `GROUP BY`.

## Rules the code must honour

**Streak.** A logged day is a trading day with at least one entry, taken or missed.
Counting requires logging within 48h of the trade date; later backfills count for every
other stat and for trade-count badges but never manufacture a streak. Saturdays are
skipped entirely. Sunday belongs to the new week because Globex opens Sunday evening,
so a Sunday-dated trade lands on Monday. One grace day per calendar month. Today never
counts against the user until it is over.

**Consistency score.** Monthly, out of 100: showing up 40, journaling completeness 20,
plan adherence 25, review habit 15. Entries are averaged **per day first**, so twenty
trades in one day count exactly as much as one. P&L, win rate and R affect nothing here.

**Visibility.** There is none. Every route requires a session, every query filters by
the current user, and no public or read-only surface exists. If an unauthenticated
route ever appears, that is a bug.

**Accounts.** Figures default to all accounts combined, switchable to one account and
remembered per user. "All accounts" means all accounts with `is_practice` off; practice
accounts are excluded from every combined figure and are visible only when selected on
their own. Money figures (net P&L, best/worst day, drawdown, equity curve) count a trade
once per assigned real account; count figures (trades logged, win rate, avg R, hold
time, MFE/MAE) count it once. Streak, consistency score and badges see real accounts
only. A practice-only trade stays in the journal and is hidden from the
combined list behind a visible count, never dropped without a trace.

**Currency.** Trades are stored in USD. One daily ECB rate per currency is applied to
every figure for display only, including historical ones. Prop firm limits stay in USD.

## Phases

**Phase 1 — local, no auth.** Postgres 18 locally, seeded single user,
`getCurrentUser()` returns it. The seed creates one default account, since a trade
cannot exist without one. Instruments, user-created accounts, trades, missed
setups, journal list and filters, new trade form with derived P&L and account
assignment, dashboard KPIs and calendar, analytics dimensions, progress rules, prop
firm rules from `PropFirmsData.md`. Screenshots on local disk, trade links stored as
plain URLs.

**Phase 2 — Vercel, with auth.** Better Auth with username, password and TOTP. Swap the
`getCurrentUser()` implementation and the storage implementation, nothing else. Then
econ calendar sync and the cron jobs.

## Not in scope

- No sharing, publishing, leaderboard or read-only views of any kind.
- No light mode and no theme toggle. Dark only.
- No public pages; a future landing page is the single planned exception.
- No raffle, prizes or rewards outside the app.
- No native mobile app. Responsive web only.
- No broker API integration. Trades arrive by hand or by CSV.
- No live market data, charts or price feeds.
- No automated trading, signals or trade suggestions.
- No billing, subscriptions or payment provider.
- No AI features.
- No Redis, no Docker, no queue system in v1.
- Nothing under "Do not build" in `context/current-feature.md`.

## Open decisions

None. Everything technical is settled — see the Decisions list in
`project-overview.md`.
