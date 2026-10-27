import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import type { JournalTradeRow } from "@/db/queries/trades";
import { moneyTone } from "@/lib/dashboard/sign-tone";
import type { JournalDayGroup } from "@/lib/journal/day-groups";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { EntryCard } from "./entry-card";
import { TimeStrip } from "./time-strip";

/** A trade date is a calendar date, not an instant: read it in UTC. */
function dayOf(date: string): TZDate {
  return new TZDate(`${date}T00:00:00Z`, "UTC");
}

/**
 * One trade date of the day log (Design.md §3.3). The date column stays in
 * view while the day's entries scroll: beside them from `lg`, as a bar under
 * the mobile top bar below it. Its counts and net P&L are the whole day's
 * within the filters, so a day cut by the page boundary heads both halves with
 * the same numbers. The time strip shows only this page's entries of the day,
 * the ones whose cards follow it. The total is money: sign colour only, and
 * none on a day of missed setups.
 */
export function JournalDay({
  day,
  currency,
}: {
  day: JournalDayGroup<JournalTradeRow>;
  currency: DisplayCurrency;
}) {
  const date = dayOf(day.date);
  const entries = `${day.entryCount} ${day.entryCount === 1 ? "entry" : "entries"}`;

  return (
    <section
      aria-label={format(date, "EEEE d MMMM yyyy")}
      className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-6"
    >
      <header className="sticky top-14 z-10 -mx-4 flex items-baseline gap-x-3 border-b bg-background/95 px-4 py-2 backdrop-blur-sm lg:top-6 lg:mx-0 lg:flex-col lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="flex items-baseline gap-2 lg:flex-col lg:gap-0">
          <span className="text-muted-foreground text-sm">
            {format(date, "EEEE")}
          </span>
          <span className="font-semibold tracking-tight lg:text-2xl">
            {format(date, "MMM d")}
          </span>
        </div>
        <span className="text-muted-foreground text-xs lg:mt-2">
          {entries}
          {day.missedCount > 0 && ` · ${day.missedCount} missed`}
        </span>
        {day.amountCents !== null && (
          <span
            className={`ml-auto font-mono text-sm tabular-nums lg:ml-0 lg:mt-1 ${moneyTone(day.amountCents)}`}
          >
            {formatCents(day.amountCents, { signed: true, currency })}
          </span>
        )}
      </header>
      <div className="flex min-w-0 flex-col gap-2">
        <TimeStrip trades={day.rows} />
        {day.rows.map((trade) => (
          <EntryCard
            key={trade.id}
            trade={trade}
            currency={currency}
            lead="time"
          />
        ))}
      </div>
    </section>
  );
}
