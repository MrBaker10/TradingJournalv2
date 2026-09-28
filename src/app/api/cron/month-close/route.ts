import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { env } from "@/lib/env";
import { runMonthCloseJob } from "@/lib/month-close/job";

// Called by Vercel Cron (vercel.json) once a day with `Authorization: Bearer
// <CRON_SECRET>`. There is no session: this route is exempt from the proxy's
// session check and authenticates by the secret instead. It returns no user
// data — only how many users it looked at and how many months it wrote.

export async function GET(request: Request) {
  if (
    !isCronAuthorized(request.headers.get("authorization"), env.CRON_SECRET)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runMonthCloseJob());
  } catch (error) {
    console.error("cron month-close: job failed", error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
