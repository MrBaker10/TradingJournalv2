// The shared demo account (project-overview.md → Decisions, 2026-10-28): one
// user with made-up data whose password is handed out, seeded by
// src/db/seed-demo.ts. Recognised by its username alone; the checks that keep
// visitors from locking each other out all ask this.

export const DEMO_USERNAME = "demo";

/** Any spelling: a sign-up for `Demo` would be stored as `demo`. */
export function isDemoUsername(username: string): boolean {
  return username.toLowerCase() === DEMO_USERNAME;
}
