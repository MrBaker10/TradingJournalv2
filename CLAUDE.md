# CLAUDE.md

**Trading-Journal.** A trade journal for prop-firm futures traders.

Ground-up rebuild. Phase 1 runs locally with no auth; phase 2 deploys to Vercel with
auth. Nothing is implemented yet.

## Read before writing code

| File | What it settles |
|---|---|
| `context/project-overview.md` | What the product is, features, data model, the product rules |
| `context/project-structure.md` | Module map, folder layout, phases, scope limits |
| `context/coding-standards.md` | Pinned versions, patterns, the non-negotiables |
| `context/ai-interaction.md` | Workflow, commits, review checklist |
| `context/current-feature.md` | What is being built right now, and its "Do not build" list |
| `context/Design.md` | All visual decisions. Authoritative for anything visual. |
| `context/PropFirmsData.md` | Prop firm rules, source of record, curated by hand |

If those files and this one disagree, the specific file wins and the disagreement gets
reported rather than silently resolved.

## Non-negotiable

1. **Ask when unclear. Never fill a gap with an assumption.** If the spec does not say
   it, it is not decided.
2. **Do not build anything under "Do not build"** in `context/current-feature.md`.
3. **Do not touch the existing Laravel/Inertia trading journal.** It is a separate repo
   and out of scope: do not read from it, copy code or schema out of it, migrate its
   data, or modify it. Only `PropFirmsData.md` and the screenshots carry over, as
   reference.
4. **Do not commit without asking**, and never with a failing gate.
5. No new dependency, and no version bump, without asking first.

## Stack

Next.js 16.3 · React 19.2 · TypeScript 7.0 · PostgreSQL 18 · Drizzle 0.45 ·
Tailwind v4 · shadcn/ui · Better Auth 1.7 (phase 2) · Biome 2.5 · Vitest 4.1 ·
Node 24 LTS · pnpm 12

Exact pins and the reasoning per line: `context/coding-standards.md`. Versions were
verified on 2026-09-08.

## Commands

Target scripts. Verify against `package.json` once the project is scaffolded.

```bash
pnpm dev              # next dev (Turbopack)
pnpm build            # next build
pnpm typecheck        # tsc --noEmit (TypeScript 7 native)
pnpm test             # vitest run
pnpm test:e2e         # playwright
pnpm lint             # biome check
pnpm db:generate      # drizzle-kit generate
pnpm db:migrate       # drizzle-kit migrate
pnpm db:seed          # single local user + one default account
pnpm db:seed:propfirms # idempotent upsert from PropFirmsData.md
pnpm job:fx           # FX rates, same handler Vercel Cron calls
pnpm job:econ         # econ calendar sync (Forex Factory weekly JSON)
pnpm job:month-close  # monthly consistency score snapshot
```

As of P0.2: only `dev`, `build`, `typecheck`, `test`, `lint` exist in `package.json`.
`test:e2e`, `db:*` and `job:*` land with the slice that creates their target
(Playwright, the DB schema, the cron handlers respectively).

Verification gates before any commit, in order: `pnpm typecheck`, `pnpm test`,
`pnpm build`, then click through the affected screens.

## Traps specific to this project

These are the mistakes that are easy to make here and expensive to find later.

- **Money is never a float.** `numeric` in Postgres, integer minor units in the domain.
  No `number` arithmetic on prices, points, P&L or R.
- **Accounts multiply money, not counts.** A trade assigned to three accounts
  contributes three times to Net P&L and once to trades logged. `src/domain/accounts.ts`
  owns the multiplier.
- **Practice accounts are excluded from every combined figure.** Every combined query
  filters `accounts.is_practice = false` first, and the multiplier counts real accounts
  only. The single-account selection is the only code path allowed to read practice data.
- **Missed setups are `trades.taken = false`.** They feed streak and badges and are
  excluded from every P&L, win rate and R figure. Not a second table.
- **Chart-clock times are never converted.** `entry_time` and `exit_time` are
  `time without time zone`. Only econ events and audit columns are `timestamptz`, and
  the user's stored timezone applies to econ events alone.
- **Nothing is shared, ever.** No public route, no share token, no read-only view, no
  leaderboard, no raffle. Every page and action sits behind a session and filters by
  the current user. An unauthenticated route is a bug.
- **Never fetch a user-supplied URL server-side.** Trade links are stored, validated as
  https and rendered as anchors. No previews, no metadata scraping, no iframes.
- **Domain logic stays pure.** `src/domain/**` has no DB client and no `next/*` imports,
  and every module ships with Vitest coverage in the same commit.
- **Aggregate in SQL**, not by pulling rows into TypeScript.
- **Money does not glow.** Process values (streak, score, badges, by-the-book,
  reviews, screenshots, links) get the neon treatment; P&L, drawdown and expectancy get
  a semantic colour and nothing else. No celebration on a green day.
- **A selected practice account is marked permanently** with the amber edge stripe,
  because its numbers render in the same green and red as real money.
- **Dark only.** No light mode, no theme toggle, `next-themes` is not a dependency.
- **`<MotionConfig reducedMotion="user">` at the app root.** The CSS
  `prefers-reduced-motion` block does not stop `motion`.
- **The econ feed is unofficial.** Read events from `econ_events` only, never call the
  feed at request time, and keep fetch and parse behind the adapter in `src/lib/econ/`.
- **An account with trades can only be archived**, never hard-deleted. A trade always
  has at least one account.
- **`getCurrentUser()` is the only way to the current user.** Phase 1 returns the seeded
  local user; phase 2 swaps in Better Auth. No component or query reads a session.

## Framework gotchas

- **TypeScript 7** has no JS compiler API until 7.1. Build type errors come from the
  native `tsc` CLI without Next.js code frames — that is expected, not a bug. Lint and
  format is Biome only; typescript-eslint cannot run against TS 7.
- **Next.js 16**: `params` and `searchParams` are Promises. Request interception lives
  in `proxy.ts`, not `middleware.ts`. Turbopack is the default. Do not enable
  `cacheComponents` — every figure here is per-user and belongs at request time.
- **Tailwind v4** has no JS config. Theme goes in `src/app/globals.css` via `@theme`.
  Never create `tailwind.config.ts`.
- **Drizzle** is still 0.x. Write aggregations with the core API (`select`, `groupBy`,
  window functions), not the Relational Query Builder, so the 1.0 upgrade stays small.
  Migrations via `db:generate` + `db:migrate`, never `push`.

## Workflow

Document the feature in `context/current-feature.md` with its "Do not build" list →
branch `feature/[name]` or `fix/[name]` → implement only what the spec says → pass the
three gates → verify in the browser → ask before committing → merge → record one line
in History.

Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). Never
mention Claude or AI generation in a commit message.

After 2–3 failed attempts at the same problem, stop and explain it. No random fixes.

## Status

- Stack and design decided 2026-09-08. No code written yet.
- Not blocked. Next step is scaffolding, then reconciling the command list above with
  the real `package.json`.
- `PropFirmsData.md` needs cleanup before seeding: four of fifteen firm blocks have lost
  their name, and headings use `##Name` without a space so they do not parse.
- Decisions and the three remaining open questions are at the end of
  `context/project-overview.md`. Do not resolve one by picking an answer.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
