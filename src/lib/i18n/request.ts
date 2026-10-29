import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing.ts";

// The dictionary for the page's language, read from the `[locale]` segment.
export default getRequestConfig(async () => {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
