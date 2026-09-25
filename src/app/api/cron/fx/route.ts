import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runFxJob } from "@/lib/fx/job";

// Called by Vercel Cron (vercel.json) with `Authorization: Bearer
// <CRON_SECRET>`. There is no session: this route is exempt from the proxy's
// session check and authenticates by the secret instead. It reads and returns
// no user data — only how many trades it checked and corrected.

function isAuthorized(header: string | null): boolean {
  const secret = env.CRON_SECRET;
  if (secret === undefined || header === null) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runFxJob());
  } catch (error) {
    console.error("cron fx: job failed", error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
