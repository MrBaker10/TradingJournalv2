# The Neon branch preview is reset from production before each rehearsal

Migrations and data refreshes run on the Neon branch `preview` before production, but
the branch was created once on 2026-09-22 and then kept in sync by hand. It drifted:
production gained accounts, trades and linked prop firm programs that `preview` never
had, and a migration usually fails on existing data, not on its SQL. So a rehearsal on
`preview` proved little. Before a migration or a data refresh touches `preview`, it is
reset from its parent `main` in the Neon console. The rehearsal then runs on exactly
the data production has, and the connection URLs in `.env.neon.preview` and the Vercel
preview environment stay the same.

## Considered Options

- **Keep the fixed branch in sync by hand:** rejected; it drifts and doubles every step
  without making the rehearsal realistic.
- **A short-lived branch from production per rehearsal:** rejected; every new branch has
  a new connection URL, so `.env.neon.preview` and the Vercel preview environment would
  change each time.
- **A schema-only branch:** rejected; it has no data, which is what migrations fail on.
- **Resetting with `neonctl`:** not now; it is a new tool, and the console reset needs
  none.

## Consequences

- `preview` holds a copy of production's user data. That is acceptable only while Sascha
  alone has access to the Neon project and the preview deployments stay behind Vercel
  Deployment Protection.
- The demo user `local`, which existed only on `preview` (P2.2), is gone after the first
  reset; previews are tested with a production login.
- Anything written to `preview` is lost at the next reset. Nothing may live only there.
