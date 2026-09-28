import Link from "next/link";
import { EconEventList } from "@/components/econ/econ-event-list";
import { EconFilters } from "@/components/econ/econ-filters";
import { listEconCurrencies, listEconEvents } from "@/db/queries/econ";
import { groupByDay, tabRange } from "@/domain/econ";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { parseEconState } from "@/lib/econ/href";

interface EconCalendarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Reads `econ_events` only. The feed is the daily job's business and is never
// called from here, so a feed outage costs freshness, never this page
// (project-overview.md, I).
export default async function EconCalendarPage({
  searchParams,
}: EconCalendarPageProps) {
  const [user, raw] = await Promise.all([getCurrentUser(), searchParams]);
  const state = parseEconState(raw);
  // One clock for the whole render: the range and the struck-through rows
  // must agree on what "now" is.
  const now = new Date();
  const range = tabRange(state.tab, now, user.timezone);

  const [events, currencies] = await Promise.all([
    listEconEvents({ ...range, ...state }),
    listEconCurrencies(range),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Econ Calendar</h1>
      <p className="text-fg-subtle text-xs">
        Forex Factory&apos;s weekly calendar, synced once a day. Times in{" "}
        {user.timezone} —{" "}
        <Link href="/settings" className="underline hover:text-cyan">
          change it in Settings
        </Link>
        .
      </p>

      <EconFilters state={state} currencies={currencies} />

      {events.length > 0 ? (
        <EconEventList
          days={groupByDay(events, user.timezone)}
          timeZone={user.timezone}
          now={now}
        />
      ) : (
        <p className="py-10 text-center text-fg-subtle text-sm">
          {currencies.length > 0
            ? "No event matches these filters."
            : state.tab === "today"
              ? "Nothing on the calendar today."
              : state.tab === "next"
                ? "Forex Factory publishes next week's calendar later in the week. It shows up here after the next daily sync."
                : "No events synced yet — the calendar fills on the next daily sync."}
        </p>
      )}
    </div>
  );
}
