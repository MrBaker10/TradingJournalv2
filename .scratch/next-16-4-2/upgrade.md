# Next.js 16.4.2 upgrade

<!-- next-upgrade: latest; path="." -->

Status: done

## Goal

Upgrade Next.js from 16.3.4 to exactly 16.4.2 and set
`experimental.agentUpgrade` to `"latest"`.

## Scope

Update the pinned dependency, its lockfile, the Next.js configuration and the
documented installed version. Preserve all other dependency pins and configuration.
Do not adopt Future Defaults or run major-version codemods.

## Duplicate checks

- No equivalent work in local branches, commits, files or existing worktrees.
- `git fetch origin` was blocked by sandbox permissions; `git ls-remote --heads
  origin` confirmed the sole remote branch is `main` at the local starting commit.
- `gh` is unavailable; the connected GitHub PR search returned no open PRs.

## Verification

- `pnpm add --save-exact next@16.4.2`: succeeded with the configured pnpm 12.3.4.
- `pnpm install --frozen-lockfile`: succeeded without lockfile changes.
- `pnpm exec next --version`: `Next.js v16.4.2`.
- `pnpm lint`: passed, 366 files checked.
- The first `pnpm typecheck` lacked generated `LayoutProps` in this fresh
  worktree. Ran the documented `pnpm exec next typegen`; then `pnpm typecheck`
  passed without source changes.
- `pnpm test`: 75 files and 1,247 tests passed; none skipped, including DB tests.
- `pnpm build`: passed using Turbopack, with `agentUpgrade: "latest"` recognized.
- Production browser smoke test on port 3001: home → sign-in navigation;
  existing session → dashboard → journal → This month filter → analytics;
  journal → New trade form. All rendered, and no console warnings/errors occurred.
  No trade was saved. The test server was stopped afterward.
- Requests without cookies: home/login 200, dashboard 307 to `/login`, trade
  export 401, auth session endpoint 200.
- `git diff --check`: passed.
- Verification used the available Node.js 26.12.0; the documented Node.js 24
  deployment runtime was not exercised.

## Review

- No upgrade regressions found. Next.js 16.4.2 documents and types
  `experimental.agentUpgrade: "latest"`.
- Direct dependency changes are limited to Next.js. Transitive changes are
  Next.js packages and its required Sharp/libvips updates; React and all other
  direct pins, package-manager policy and existing configuration are preserved.
- No Future Defaults or Cache Components were enabled; no migrations or domain
  code changed.
- Final connected GitHub search again found no open PRs.
- Verified changes are on `chore/next-16-4-2`, based on `d64b37f`, in a
  separate worktree. The verification checkpoint was accepted, and the user
  explicitly approved commit, push and draft PR publication.
