# AI Interaction Guidelines

Project: **Trading-Journal**. Read `context/project-structure.md`
for the module map and `context/coding-standards.md` before writing code.

## Communication

- Be concise and direct.
- Explain non-obvious decisions briefly.
- **Ask when something is unclear. Never fill a gap with an assumption.** If the spec
  does not say it, it is not decided.
- Do not build anything listed under "Do not build" in `context/current-feature.md`.
- Do not add features that are not in the current feature spec.
- Never delete files without asking first.
- Ask before large refactors or architectural changes.

## Workflow

Same loop for every feature and every fix:

1. **Document** — write the feature into `context/current-feature.md`, including its
   "Do not build" list.
2. **Branch** — `feature/[name]` or `fix/[name]`.
3. **Implement** — only what the spec says.
4. **Verify** — three gates, in this order:
   - `pnpm typecheck` (tsc from TypeScript 7)
   - `pnpm test` for anything touching `src/domain/**`
   - `pnpm build`, then click through the affected screens in the browser
5. **Iterate** — fix and re-verify.
6. **Commit** — only after all three gates pass. Ask first.
7. **Merge** to main, then ask before deleting the branch.
8. **Record** — mark done in `context/current-feature.md` and append one line to History.

If the build fails, fix it before committing. Do not commit around a failing gate.

## Domain logic is not optional

Anything in `src/domain/**` (P&L, R multiples, streaks, consistency score, badges,
CSV shape detection) requires unit tests in the same commit. These
rules are the product. A silent change to a streak rule is a bug the user only finds
weeks later, so no PR touching `src/domain/**` is done without tests.

## Commits

- Ask before committing. Never auto-commit.
- Conventional messages: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- One feature or fix per commit.
- Never mention Claude or AI generation in commit messages.

## Code changes

- Minimal change that accomplishes the task.
- Do not refactor unrelated code unless asked.
- No "nice to have" additions.
- Preserve existing patterns. If a pattern seems wrong, say so instead of quietly
  introducing a second one.

## When stuck

- After 2–3 failed attempts, stop and explain the problem. No random fixes.
- If a requirement is ambiguous, ask. Do not pick the interpretation that is easiest
  to build.
- If external documentation is needed (Next.js 16, Drizzle, Better Auth), read the
  current docs rather than relying on memory. Version drift is a real cost in this
  stack.

## Review checklist

Review generated code against these, in this order:

1. **Money** — no floating point on prices, points, P&L or R. See "Money" in
   `context/coding-standards.md`.
2. **Ownership** — every query filters by the current user. No route trusts an id from
   the client without an ownership check. Account ids from the client are verified
   against the current user before a trade is assigned to them.
3. **Visibility** — no route is reachable without a session. There is no public page,
   share token or read-only view anywhere in this project.
4. **Time** — chart-clock times stay unconverted. Only econ events and audit columns
   are timezone-aware.
5. **Domain rules** — streak, consistency and badge behaviour matches
   `context/project-structure.md`. Any deviation needs a test proving it is intended.
6. **Performance** — no N+1 in the journal list or analytics; aggregate in SQL, not in
   TypeScript.
7. **Migrations** — schema change and its generated migration land in the same commit.
