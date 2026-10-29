import { useTranslations } from "next-intl";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/lib/env";

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <AuthCard title={t("signIn")}>
      <LoginForm registrationOpen={env.REGISTRATION_OPEN} />
    </AuthCard>
  );
}
