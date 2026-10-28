import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { buttonVariants } from "@/components/ui/button";
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
          className={buttonVariants({ size: "lg", className: "h-10 w-full" })}
        >
          Sign in
        </Link>
        {env.REGISTRATION_OPEN && (
          <Link
            href="/register"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-10 w-full",
            })}
          >
            Create account
          </Link>
        )}
      </div>
    </AuthCard>
  );
}
