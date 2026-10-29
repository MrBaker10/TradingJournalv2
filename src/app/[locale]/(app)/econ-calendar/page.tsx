import { EconEvents } from "@/components/econ/econ-events";
import { EconFilters } from "@/components/econ/econ-filters";
import {
  hasEconEvents,
  listEconCurrencies,
  listEconEvents,
} from "@/db/queries/econ";
import { groupByDay, tabRange } from "@/domain/econ";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { parseEconState } from "@/lib/econ/href";
import { Link } from "@/lib/i18n/navigation";

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
  // Only an empty range asks whether anything was ever synced: that decides
  // which rule the empty state explains.
  const synced = currencies.length > 0 || (await hasEconEvents());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="page-title">Econ Calendar</h1>
        <p className="text-muted-foreground text-xs">
          Forex Factory&apos;s weekly calendar, synced once a day. Times in{" "}
          {user.timezone} —{" "}
          <Link
            href="/settings"
            className="underline underline-offset-2 hover:text-foreground"
          >
            change it in Settings
          </Link>
          .
        </p>
      </header>

      <EconFilters state={state} currencies={currencies} />

      {events.length > 0 ? (
        <EconEvents
          days={groupByDay(events, user.timezone)}
          timeZone={user.timezone}
          now={now}
        />
      ) : (
        <p className="mx-auto max-w-md py-10 text-center text-muted-foreground text-sm">
          {!synced
            ? "No events fetched yet — the calendar fills on the next daily sync."
            : currencies.length > 0
              ? "No event matches these filters. Clear a currency or High impact only."
              : state.tab === "today"
                ? "Nothing on the calendar today."
                : state.tab === "next"
                  ? "Forex Factory publishes next week's calendar later in the week. It shows up here after the next daily sync."
                  : "Nothing on the calendar this week."}
        </p>
      )}
    </div>
  );
}
