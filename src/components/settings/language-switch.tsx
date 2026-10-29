"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setInterfaceLanguage } from "@/actions/interface-language";
import { notifyError } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { LANGUAGES, type Language } from "@/lib/i18n/languages";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { SettingsRow } from "./settings-row";

/**
 * Settings' language choice (docs/adr/0008): stores it on the user, then
 * shows this page under its prefix. It marks the stored language, which an
 * `/en/…` link does not change. The demo account stores nothing (`stored` is
 * null): it marks the page's language, and the move alone switches this
 * browser.
 */
export function LanguageSwitch({ stored }: { stored: Language | null }) {
  const t = useTranslations();
  const current = useLocale();
  const selected = stored ?? current;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(language: Language) {
    if (language === selected && language === current) return;
    startTransition(async () => {
      const result = await setInterfaceLanguage(language).catch(() => null);
      if (!result?.success) {
        notifyError(t("settings.language.saveFailed"));
        return;
      }
      // Already on that prefix (an `/en/…` link while German was stored):
      // only the stored mark changes, so re-read the page in place.
      if (language === current) {
        router.refresh();
        return;
      }
      const search = searchParams.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, {
        locale: language,
      });
    });
  }

  return (
    <SettingsRow
      title={
        <span id="language-switch-label">
          {t("settings.sections.language")}
        </span>
      }
      hint={
        stored === null
          ? t("settings.language.demoHint")
          : t("settings.language.hint")
      }
      action={
        <fieldset
          aria-labelledby="language-switch-label"
          disabled={pending}
          className="flex rounded-lg border p-0.5"
        >
          {LANGUAGES.map((language) => (
            <Toggle
              key={language}
              lang={language}
              pressed={language === selected}
              onPressedChange={() => choose(language)}
              className="h-10 text-muted-foreground aria-pressed:text-foreground lg:h-8"
            >
              {t(`languages.${language}`)}
            </Toggle>
          ))}
        </fieldset>
      }
    />
  );
}
