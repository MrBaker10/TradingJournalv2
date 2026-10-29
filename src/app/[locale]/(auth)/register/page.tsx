import { useTranslations } from "next-intl";
import { AUTH_LINK, AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { env } from "@/lib/env";
import { Link } from "@/lib/i18n/navigation";

export default function RegisterPage() {
  const t = useTranslations("auth");
  if (!env.REGISTRATION_OPEN) {
    // The sign-up endpoint is closed as well (disableSignUp in auth.ts);
    // this only says so instead of showing a form that cannot succeed.
    return (
      <AuthCard title={t("createAccount")}>
        <p className="text-muted-foreground text-sm">
          {t("registrationClosed")}
        </p>
        <Link href="/login" className={`text-xs ${AUTH_LINK}`}>
          {t("backToSignIn")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("createAccount")}>
      <RegisterForm />
    </AuthCard>
  );
}
