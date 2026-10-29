import * as z from "zod";
import { LANGUAGES } from "../lib/i18n/languages.ts";

/** The set-language action's input: one of the languages (docs/adr/0008). */
export const setInterfaceLanguageSchema = z.enum(LANGUAGES);
