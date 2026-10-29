import { revalidatePath } from "next/cache";
import { LANGUAGES, withLanguage } from "./languages.ts";

/**
 * revalidatePath for a page path written without its language prefix
 * (`/journal`): every page lives under `/[locale]`, so the literal path is
 * refreshed under each language.
 */
export function revalidatePage(pathname: string): void {
  for (const language of LANGUAGES) {
    revalidatePath(withLanguage(language, pathname));
  }
}
