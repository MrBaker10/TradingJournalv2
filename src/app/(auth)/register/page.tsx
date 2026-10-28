import Link from "next/link";
import { AUTH_LINK, AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { env } from "@/lib/env";

export default function RegisterPage() {
  if (!env.REGISTRATION_OPEN) {
    // The sign-up endpoint is closed as well (disableSignUp in auth.ts);
    // this only says so instead of showing a form that cannot succeed.
    return (
      <AuthCard title="Create account">
        <p className="text-muted-foreground text-sm">
          New accounts can't be created here.
        </p>
        <Link href="/login" className={`text-xs ${AUTH_LINK}`}>
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create account">
      <RegisterForm />
    </AuthCard>
  );
}
