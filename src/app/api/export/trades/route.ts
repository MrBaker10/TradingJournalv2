import { NextResponse } from "next/server";
import { listTradesForExport } from "@/db/queries/export";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { toCsv } from "@/lib/csv/serialize";
import { tradesToCsvRows } from "@/lib/csv/trade-export";
import { todayInTimeZone } from "@/lib/time";

// A route handler rather than a Server Component or a Server Action: a
// download needs real response headers, and a Server Component cannot set
// Content-Disposition. Same reason src/app/api/uploads/route.ts exists.
//
// It takes no parameters at all. The user comes from getCurrentUser() and
// nothing else — an export route that accepts a user id, an account or a date
// range is either a leak or a filtered backup, and "an export that depends on
// a UI filter is not a backup" (project-overview.md, D).

export async function GET() {
  const user = await getCurrentUser();
  const rows = await listTradesForExport(user.id);
  const csv = toCsv(tradesToCsvRows(rows));
  const filename = `trading-journal-${todayInTimeZone(user.timezone)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
