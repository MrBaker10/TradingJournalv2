import type { JournalTradeRow } from "@/db/queries/trades";
import type { JournalDayGroup } from "@/lib/journal/day-groups";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { formatEventDayLabel } from "@/lib/time";
import { TradeRow } from "./trade-row";

interface JournalDayProps {
  day: JournalDayGroup<JournalTradeRow>;
  currency: DisplayCurrency;
}

// Design.md §4.27: one trade date of the journal list — a heading without a
// surface of its own, then the day's rows with the entry time in front. The
// counts and the total are the whole day's within the filters, so a day
// continued from the previous page heads its rest with the same numbers. The
// total is money: semantic colour, no glow, and none at all on a day of
// missed setups only.
export function JournalDay({ day, currency }: JournalDayProps) {
  const label = formatEventDayLabel(day.date);

  return (
    <section aria-label={label} className="flex flex-col gap-[10px]">
      {/* pr-3 matches the row's p-3, so the total lines up with the amounts. */}
      <h2 className="flex items-baseline gap-2 pt-2 pr-3 pl-1 text-sm">
        <span className="font-medium text-fg">{label}</span>
        <span className="text-fg-muted text-xs">
          {day.entryCount}
          <span className="hidden sm:inline">
            {day.entryCount === 1 ? " entry" : " entries"}
          </span>
          {day.missedCount > 0 && ` · ${day.missedCount} missed`}
        </span>
        {day.amountCents !== null && (
          <span
            className={`ml-auto font-mono ${
              day.amountCents >= 0 ? "text-success-fg" : "text-danger-fg"
            }`}
          >
            {formatCents(day.amountCents, { signed: true, currency })}
          </span>
        )}
      </h2>
      {day.rows.map((trade) => (
        <TradeRow
          key={trade.id}
          trade={trade}
          currency={currency}
          metaLead="time"
        />
      ))}
    </section>
  );
}
