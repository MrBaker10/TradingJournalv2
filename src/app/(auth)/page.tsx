import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { env } from "@/lib/env";

// The front page: two ways in and nothing else. It is public (src/proxy.ts)
// and reads no session and no data, so it renders even when the database is
// down. Signed in or not, it looks the same.
export default function Home() {
  return (
    <AuthCard title="Welcome">
      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="flex h-10 items-center justify-center rounded-ctl bg-[image:var(--gradient-info)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-button-primary)] transition duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-button-primary-hover)] hover:brightness-110 active:scale-[.978]"
        >
          Sign in
        </Link>
        {env.REGISTRATION_OPEN && (
          <Link
            href="/register"
            className="flex h-10 items-center justify-center rounded-ctl border border-white/12 bg-white/5 px-4 font-medium text-fg text-sm transition duration-200 hover:-translate-y-px hover:border-cyan/35 hover:brightness-110 active:scale-[.978]"
          >
            Create account
          </Link>
        )}
      </div>
    </AuthCard>
  );
}
