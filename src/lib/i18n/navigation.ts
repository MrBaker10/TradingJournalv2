import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing.ts";

// Drop-in replacements for next/link and next/navigation that keep the current
// language prefix. Paths are written without it (`/journal`); usePathname
// returns them without it too.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
