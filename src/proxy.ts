import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

// Every request without a session is turned away here, before a page or a
// route handler runs. Proxy runs on the Node runtime by default in Next 16
// (and may not set `runtime`), so the full session check — database
// included — is available, not only a look at the cookie.
//
// This is the first gate, not the only one: getCurrentUser() checks again in
// every page, Server Action and route handler, because a matcher that misses
// a path would otherwise leave it open (Next docs, proxy.md, "Server
// Functions").

/** The only paths reachable without a session. Everything else is behind one. */
const PUBLIC_PATHS = ["/", "/login", "/register"];
const PUBLIC_PREFIXES = ["/api/auth/"];

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) {
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
    if (pathname.startsWith("/api/")) {
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

  // A route handler answers a status, not a login page it cannot render.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except Next's own build output and the favicon. Fonts are
  // bundled under /_next, so they are covered by the first exclusion.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
