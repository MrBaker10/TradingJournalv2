import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/** A text link inside the card: sign in, create account, switch code kind. */
export const AUTH_LINK =
  "font-medium text-primary underline-offset-4 hover:underline";

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

// Design.md §3.13: one calm card, centred, outside the app shell. No sidebar —
// nothing it would link to is reachable before signing in.
export function AuthCard({ title, children }: AuthCardProps) {
  const t = useTranslations("auth");
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {t("brand")}
          </span>
          <h1 className="font-semibold text-xl">{title}</h1>
        </div>
        {children}
      </section>
    </main>
  );
}
