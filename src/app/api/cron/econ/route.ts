import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runEconJob } from "@/lib/econ/job";
import { env } from "@/lib/env";

// Called by Vercel Cron (vercel.json) once a day with `Authorization: Bearer
// <CRON_SECRET>`. There is no session: this route is exempt from the proxy's
// session check and authenticates by the secret instead. It reads and returns
// no user data — only how many events each feed week carried.
//
// The only caller of the Forex Factory feed besides `pnpm job:econ`. A page
// never fetches it (project-overview.md, I).

export async function GET(request: Request) {
  if (
    !isCronAuthorized(request.headers.get("authorization"), env.CRON_SECRET)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runEconJob());
  } catch (error) {
    console.error("cron econ: job failed", error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
