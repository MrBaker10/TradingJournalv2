"use client";

import { useLocale, useTranslations } from "next-intl";
import { LANGUAGES } from "@/lib/i18n/languages";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The signed-out pages' language switch: the same page under each prefix.
 * Plain links — the proxy stores the language of every page it serves in the
 * `language` cookie (docs/adr/0008), so no action is needed before sign-in.
 */
export function LanguageLinks({ className }: { className?: string }) {
  const t = useTranslations("languages");
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav
      aria-label={t("switchLabel")}
      className={cn("flex items-center gap-3 text-xs", className)}
    >
      {LANGUAGES.map((language) => (
        <Link
          key={language}
          href={pathname}
          locale={language}
          lang={language}
          aria-current={language === current ? "true" : undefined}
          className="text-muted-foreground underline-offset-4 hover:underline aria-[current]:font-medium aria-[current]:text-foreground"
        >
          {t(language)}
        </Link>
      ))}
    </nav>
  );
}
