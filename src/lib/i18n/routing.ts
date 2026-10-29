import { defineRouting } from "next-intl/routing";
import { DEFAULT_LANGUAGE, LANGUAGES } from "./languages.ts";

// Every page carries its language as the first path segment (docs/adr/0008).
// Detection and the locale cookie are off: src/proxy.ts decides through
// resolveLanguage, so next-intl only renders and builds links.
export const routing = defineRouting({
  locales: LANGUAGES,
  defaultLocale: DEFAULT_LANGUAGE,
  localePrefix: "always",
  localeDetection: false,
  localeCookie: false,
});
