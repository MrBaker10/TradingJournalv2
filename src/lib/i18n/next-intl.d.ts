import type messages from "./messages/en.json";
import type { routing } from "./routing.ts";

// English is the reference dictionary: a key missing there is a type error.
// German is held to the same keys by __tests__/messages.test.ts.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
