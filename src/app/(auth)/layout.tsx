import type { ReactNode } from "react";

// Front page, login and registration: the only pages reachable without a
// session (src/proxy.ts). All three read REGISTRATION_OPEN, which has to be
// the running server's value, not the one present at build time.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
