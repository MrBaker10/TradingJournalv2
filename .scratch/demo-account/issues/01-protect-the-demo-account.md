# 01: Protect the demo account

**What to build:** The `demo` user is seeded into production (`src/db/seed-demo.ts`,
`--allow-host`) so the journal can be shown to people with a shared password. Anyone
who has that password can today change it, turn on two-factor, rename the user, delete
the account or export it, and so lock everyone else out or empty the demo. Decide which
of these a visitor of the demo may do, and keep the rest from happening. Separately,
nobody else should be able to register the username `demo`.

This is a product and auth decision, not a detail: it adds a rule for one special user
next to the auth exceptions in `context/coding-standards.md` → "Visibility". Settle the
rules with Sascha before building.

**Blocked by:** —

**Status:** needs-triage

## Open questions

- Which settings stay open on the demo (accounts, checklist, logging trades) and which
  are refused (password, two-factor, username, delete account, export)?
- How is the demo user recognised: by username, by a flag, by configuration?
- Does the demo reset itself (for example a nightly re-seed), or only when Sascha runs
  the seed?
- Is `demo` reserved at registration, and does that need a list of reserved names?
