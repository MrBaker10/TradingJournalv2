import type { ReactNode } from "react";

// Front page, login and registration: the only pages reachable without a
// session (src/proxy.ts). All three read REGISTRATION_OPEN, which has to be
// the running server's value, not the one present at build time.
export const dynamic = "force-dynamic";

// The v1 page glow stays behind these pages until their redesign ticket
// (.scratch/redesign/issues/14-*); the app shell has none.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="page-glow fixed inset-0 -z-10 pointer-events-none" />
      {children}
    </>
  );
}
