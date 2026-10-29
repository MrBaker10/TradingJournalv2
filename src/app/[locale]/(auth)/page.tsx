import { useTranslations } from "next-intl";
import { AuthCard } from "@/components/auth/auth-card";
import { buttonVariants } from "@/components/ui/button";
import { env } from "@/lib/env";
import { Link } from "@/lib/i18n/navigation";

// The front page: two ways in and nothing else. It is public (src/proxy.ts)
// and reads no session and no data, so it renders even when the database is
// down. Signed in or not, it looks the same.
export default function Home() {
  const t = useTranslations("auth");
  return (
    <AuthCard title={t("welcome")}>
      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className={buttonVariants({ size: "lg", className: "h-10 w-full" })}
        >
          {t("signIn")}
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
            {t("createAccount")}
          </Link>
        )}
      </div>
    </AuthCard>
  );
}
