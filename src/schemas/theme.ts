import * as z from "zod";
import { THEME_PICKS } from "../lib/theme.ts";

/** The set-theme action's input: one of the picks, nothing else (docs/adr/0007). */
export const setThemeSchema = z.enum(THEME_PICKS);
