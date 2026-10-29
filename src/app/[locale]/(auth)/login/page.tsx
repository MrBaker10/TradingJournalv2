import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/lib/env";

export default function LoginPage() {
  return (
    <AuthCard title="Sign in">
      <LoginForm registrationOpen={env.REGISTRATION_OPEN} />
    </AuthCard>
  );
}
