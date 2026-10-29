import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  LANGUAGE_COOKIE,
  type Language,
  resolveLanguage,
} from "@/lib/i18n/languages";

// Every request without a session is turned away here, before a page or a
// route handler runs. Proxy runs on the Node runtime by default in Next 16
// (and may not set `runtime`), so the full session check — database
// included — is available, not only a look at the cookie.
//
// This is the first gate, not the only one: getCurrentUser() checks again in
// every page, Server Action and route handler, because a matcher that misses
// a path would otherwise leave it open (Next docs, proxy.md, "Server
// Functions").
//
// Pages also get their language here (docs/adr/0008): a path without a valid
// prefix is redirected by resolveLanguage, which holds every rule; this file
// only feeds it the request.

/**
 * The only paths reachable without a session. Everything else is behind one.
 * Page paths are listed without their language prefix and are public under
 * each one. `/api/cron/` has no session either — Vercel Cron calls it — and
 * checks `CRON_SECRET` itself; it returns no user data.
 */
const PUBLIC_PATHS = ["/", "/login", "/register"];
const PUBLIC_PREFIXES = ["/api/auth/", "/api/cron/"];

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

/** `/de/journal` → `/journal`, `/de` → `/`. */
function withoutLanguage(pathname: string, language: Language): string {
  return pathname.slice(language.length + 1) || "/";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Route handlers carry no language; pages always do.
  let language: Language | null = null;
  if (!isApi) {
    const decision = resolveLanguage({
      pathname,
      // users.language arrives with the stored-language ticket.
      storedLanguage: null,
      cookie: request.cookies.get(LANGUAGE_COOKIE)?.value,
      acceptLanguage: request.headers.get("accept-language"),
    });
    if (decision.kind === "redirect") {
      const target = request.nextUrl.clone();
      target.pathname = decision.pathname;
      return NextResponse.redirect(target);
    }
    language = decision.language;
  }

  const route = language ? withoutLanguage(pathname, language) : pathname;
  if (isPublic(route)) {
    return NextResponse.next();
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    // The session could not be read at all — in practice the database is
    // unreachable. Not treated as "signed out": a redirect to /login would
    // hide the outage, and signing in would fail on the same database.
    console.error("proxy: session lookup failed", error);
    if (isApi) {
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 },
      );
    }
    return new NextResponse(
      "Database unreachable. Start Postgres and reload.",
      {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }
  if (session) {
    return NextResponse.next();
  }

  // A route handler (the only request without a language) answers a status,
  // not a login page it cannot render.
  if (!language) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL(`/${language}/login`, request.url));
}

export const config = {
  // Everything except Next's own build output and the favicon. Fonts are
  // bundled under /_next, so they are covered by the first exclusion.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
