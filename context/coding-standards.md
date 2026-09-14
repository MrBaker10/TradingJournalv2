# Coding Standards

Stack of record, pinned as of 2026-09-08. Do not upgrade a line without a separate
commit that changes nothing else.

| | |
|---|---|
| Node | 24 LTS |
| Next.js | 16.3.4 (App Router) |
| React | 19.2.8 |
| TypeScript | 7.0.2 |
| PostgreSQL | 18.x — lokal 18.4 (DBngin), Ziel 18.6, Neon wählt in Phase 2 selbst |
| Drizzle ORM / Kit | 0.45.2 / 0.31.10 |
| Better Auth | 1.7.3 (phase 2) |
| Tailwind CSS | 4.3.3 |
| Zod / RHF / resolvers | 4.5.4 / 7.87.0 / 5.9.1 |
| Recharts | 3.10.1 |
| motion (ex framer-motion) | 13.2.0 |
| Sonner (Toasts) | 2.0.8 |
| Biome | 2.5.12 |
| Vitest / Playwright | 4.1.11 / 1.63.0 |
| pnpm | 12.3.4 |

## TypeScript

- `strict: true`. No `any`; use `unknown` and narrow.
- TypeScript 7 has no JavaScript compiler API until 7.1. Consequences:
  - Type errors during `next build` come from the native `tsc` CLI and have no
    Next.js-specific code frames. Do not chase that as a bug.
  - Lint and format is **Biome only**. Do not add ESLint or Prettier; typescript-eslint
    cannot use the TS 7 API yet.
  - If a build tool needs the old API, add `@typescript/typescript6` for that tool
    alone. Never downgrade the whole project silently.
- Types for props, action inputs/outputs and DB rows. Infer where obvious.
- Derive types from the Drizzle schema and Zod schemas. Do not hand-write a second
  shape for the same data.

## React

- Function components only. Hooks for state and effects.
- One job per component. Reusable logic goes into a hook in `src/hooks/`.
- No browser storage APIs for anything that belongs in Postgres.

## Next.js 16

- Server Components by default. `'use client'` only for interactivity, hooks or
  browser APIs.
- `params` and `searchParams` are Promises. Always `await` them.
- Route-level request interception lives in `proxy.ts`, not `middleware.ts`, and runs
  on the Node runtime only.
- Turbopack is the default bundler for dev and build. No custom webpack config.
- **Do not enable `cacheComponents` in v1.** Every number in this app is per-user and
  belongs at request time, behind a session.
- Writes are Server Actions. Route handlers only for:
  - cron endpoints (`/api/cron/*`)
  - screenshot upload and signed-URL issuing
  - webhooks, if any ever arrive
  - file downloads that need response headers (`/api/export/*`)
- Everything else fetches directly in the Server Component.

## Tailwind CSS v4

**CRITICAL**: v4 uses CSS-based configuration.

- **Do not** create `tailwind.config.ts` or `tailwind.config.js`. Those are v3.
- Theme configuration goes in `src/app/globals.css` via `@theme`.
- Use CSS custom properties for colours and spacing.

```css
@import "tailwindcss";

@theme {
  --color-accent: oklch(62% 0.21 295);
}
```

## Styling

- Tailwind for all styling. shadcn/ui where a primitive exists.
- No inline styles.
- **Dark only.** There is no light mode and no theme toggle. `next-themes` is not a
  dependency. Light mode is a Future item and a separate design round, not a token
  override — see `Design.md`.
- Numbers use the mono font with tabular figures. P&L, R and points are read as
  columns, so they must align.
- Colours live in `@theme` as tokens. **No hex and no `rgba()` literal inside a
  component**, ever. This is what keeps a later light mode possible at all.
- Fonts: Instrument Sans and IBM Plex Mono via `next/font/local`, loading font files
  vendored in `src/app/fonts/`. Never `next/font/google` — it still fetches from
  Google's servers at build time even though the browser never does. Vendor files from
  the font's official foundry repo (e.g. GitHub releases), not from Google. See
  `project-overview.md` Decisions.
- **Money does not glow.** Process values get the neon treatment, money values get a
  semantic colour and nothing else. `Design.md` section 1 is the rule, not a suggestion.

## Motion

- `motion` for row expansion, disclosure panels, the streak bump, the load-in of
  calendar and score, and the sidebar's active-nav-indicator (`AnimatePresence`
  scale/opacity spring, independent per item). CSS transitions for everything else:
  hover, focus, colour and border changes.
- **Hover is CSS even when `motion` already wraps the component.** Reaching for
  `whileHover` because the element happens to be a `motion.div` is the easy mistake:
  the calendar's 2px lift was written that way in S8, looked right in review, and never
  took effect once. It is CSS now.
- **Tailwind v4 drives `translate-*` through the `translate` property, not `transform`.**
  A `transition-[…]` that names `transform` therefore does not cover it and the value
  jumps. Read the generated stylesheet for the property that is actually set, rather
  than the one the utility name suggests.
- **`<MotionConfig reducedMotion="user">` at the app root is mandatory.** The
  `prefers-reduced-motion` CSS block does not stop `motion`, which animates through
  JS-set inline styles. Without it the accessibility promise in `Design.md` is false.
- No animation without a trigger, and none that shifts layout. Only `opacity`,
  `transform`, `box-shadow`, `max-height` and colours move.

## Database

- Drizzle ORM. Schema in `src/db/schema/`, one file per domain area.
- Migrations: `pnpm db:generate` then `pnpm db:migrate`. **Never `push`** outside a
  throwaway local database. Schema change and migration in the same commit.
- Analytics and aggregation use the Drizzle **core API** (`select`, `groupBy`, window
  functions), not the Relational Query Builder. Drizzle 1.0 rewrites the RQB and this
  keeps the future upgrade small.
- Aggregate in SQL. Do not pull rows into TypeScript to sum them.
- **A `sql<T>` template asserts the return type, it does not check it.** Postgres hands a
  `timestamptz` back from a raw template as a **string**, while the same column read
  through a Drizzle column comes back as a `Date`. `string > Date` then coerces both
  toward number, the string becomes `NaN`, and every comparison is silently false.
  Compare two columns **in SQL**, where both sides are typed. Cost one real bug in the
  dashboard streak bump — see `decisions.md`, Designrunde 1.
- **Drizzle qualifies a column reference inside a `where` clause, but not inside a select
  list.** A correlated subquery in a select list renders `where "user_id" = "id"`, which
  postgres reads as two columns of the same table and happily matches the wrong rows.
  Bind the value as a parameter instead of correlating, or spell the identifier out
  against an alias.
- Every table that holds user data has `user_id`. Every query filters on it.
- An `account_id` coming from the client is checked against the current user before
  use, in exactly the same way as a trade id. Accounts are a permission boundary, not
  just a label.
- Two tables that reference each other (a circular FK) resolve via Drizzle's
  `.references(() => col)` thunk with an explicit `AnyPgColumn` return type — without
  it, TypeScript's circular type inference between the two tables breaks. First
  instance: `src/db/schema/accounts.ts` ↔ `users.ts`.

## Money

Non-negotiable, because this is a P&L tool:

- Storage: `numeric(14,2)` for currency, `numeric(12,4)` for prices and points,
  `integer` for contracts and account counts.
- Domain math: integer minor units (cents). Never `number` arithmetic on money.
- Point value comes from the `instruments` table, never a literal in a component.
- Derived P&L and R are computed in `src/domain/pnl.ts` and stay overridable by the
  user, exactly as the New Trade form shows.
- Currency conversion is display-only. Trades stay in USD. Prop firm limits stay in
  USD and are never converted.
- **Money aggregates multiply by assigned account count, count aggregates do not.** A
  trade on three accounts contributes three times to net P&L and once to trades logged.
  Getting this wrong misstates P&L silently, so every aggregate query states which of
  the two it is, and `src/domain/accounts.ts` owns the multiplier.
- **Every combined query filters `accounts.is_practice = false` first**, and the money
  multiplier counts real assigned accounts only. This applies to money, counts,
  calendar, equity curve, streak, consistency and badges alike. A practice
  account's own figures are reachable only through an explicit single-account selection,
  which is the one code path allowed to read `is_practice = true` data.

## Time

- `trade_date` is `date`.
- The user's timezone lives on `users` and decides every **calendar boundary**: what
  "today" and "this month" mean for streak, consistency score and badges, and when a
  trade's 48h logging window closes. Econ events render in it too.
- It is never applied to `entry_time` / `exit_time`. Those are the user's chart clock
  and stay unconverted.
- `entry_time` / `exit_time` are `time without time zone`. This is the user's chart
  clock and is **never** converted to another timezone.
- Econ events and audit columns are `timestamptz`.
- Formatting with `date-fns` and `@date-fns/tz`. No ad-hoc `Date` arithmetic.

## Domain logic

- `src/domain/**` is pure: no DB client, no `next/*` imports, no `Date.now()` passed
  in implicitly. Clock and inputs are arguments.
- Every module has a Vitest suite. Streak, consistency score, badges and CSV shape
  detection are covered by tests before the UI uses them.

## Data fetching and validation

- Server Components read directly through the Drizzle client.
- Client Components call Server Actions.
- Every action input is validated with Zod. The schema lives in `src/schemas/` and is
  **shared** with the form via `@hookform/resolvers`. One validation truth.
- Never trust a client-supplied id. Re-check ownership in the action.

## Auth and storage seams

- Access the current user only through `getCurrentUser()` in `src/lib/auth/`. In phase 1
  it returns the seeded local user; in phase 2 the implementation swaps to Better Auth.
  No component or query reads a session directly.
- File access goes through the storage interface in `src/lib/storage/`. Local disk in
  development, Cloudflare R2 in production. Screenshots are private and served through
  signed URLs only.

## External links on trades

- Validate on write: `https` scheme only, parsed with the URL API, length capped. No
  `http`, no `javascript:`, no `data:`.
- **Never fetch a user-supplied URL server-side.** No link previews, no metadata
  scraping, no thumbnail generation. That is an SSRF hole and it buys nothing here.
- Never embed a third-party URL in an iframe. Render an anchor with
  `target="_blank" rel="noopener noreferrer"`.
- Links are per-trade data and, like notes and screenshots, never leave the owner's
  session.

## Visibility

- There is no public route, no share token and no read-only view. Every page and every
  action runs behind a session and filters by the current user.
- An unauthenticated route is a bug, not a feature. If one is needed later it needs its
  own read model, reviewed on its own.

## Error handling

- `try/catch` in Server Actions.
- Actions return `{ success, data, error }`.
- User-facing errors surface as a Sonner toast. Field validation stays inline.
- Never swallow an error silently. If it cannot be handled, log it and return `success: false`.

## File organisation

- Components: `src/components/[feature]/ComponentName.tsx`
- Pages: `src/app/[route]/page.tsx`
- Server Actions: `src/actions/[feature].ts`
- Zod schemas: `src/schemas/[feature].ts`
- Domain logic: `src/domain/[area].ts`
- DB schema: `src/db/schema/[area].ts`
- Queries: `src/db/queries/[area].ts`
- Libs and utils: `src/lib/[area]/`
- Types: `src/types/[feature].ts`

## Naming

- Components: PascalCase (`TradeRow.tsx`)
- All other files: kebab-case (`consistency-score.ts`)
- Functions: camelCase. Constants: SCREAMING_SNAKE_CASE. Types: PascalCase, no prefix.
- DB columns: snake_case. Drizzle fields: camelCase.

## Code quality

- No commented-out code.
- No unused imports or variables.
- Functions under 50 lines where possible.
- `pnpm typecheck`, `pnpm test` and `pnpm build` all pass before a commit.
