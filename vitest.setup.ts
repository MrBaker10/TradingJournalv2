// Mirrors the `--env-file=.env.local` flag the db:* scripts already use
// (package.json) — `vitest run` has no such flag of its own, so without this
// setup file `process.env.DATABASE_URL` is undefined and any test that
// imports src/db/index.ts fails at import time, before it can even check
// whether Postgres itself is reachable.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional: a fresh checkout without local Postgres set up
  // yet should still run every DB-independent test.
}
