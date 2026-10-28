import type { JournalTradeRow } from "@/db/queries/trades";
import { signOf } from "@/lib/dashboard/sign-tone";
import { timeStrip } from "@/lib/journal/time-strip";

const DOT_FILL = {
  positive: "fill-positive",
  negative: "fill-negative",
  zero: "fill-foreground/60",
  missed: "fill-muted-foreground/50",
} as const;

function dotFill(trade: JournalTradeRow): string {
  if (!trade.taken) return DOT_FILL.missed;
  if (trade.displayPnlCents === null) return DOT_FILL.zero;
  return DOT_FILL[signOf(trade.displayPnlCents)];
}

/**
 * The day's entries on the chart clock (Design.md §3.3): a dot per entry at
 * its stored entry time, in the sign colour of its P&L, a missed setup grey.
 * The times are shown as stored; no time zone applies to them. A picture only:
 * the cards below carry the same times and are the way into each entry.
 *
 * Hand-built SVG without a `viewBox`: positions are percentage attributes from
 * `timeStrip`, so the dots keep their size at any width and nothing needs an
 * inline style (coding-standards.md → Charts).
 */
export function TimeStrip({ trades }: { trades: JournalTradeRow[] }) {
  const strip = timeStrip(trades.map((trade) => trade.entryTime));

  return (
    <svg aria-hidden="true" className="h-8 w-full overflow-visible">
      <line x1="0" x2="100%" y1="10" y2="10" className="stroke-border" />
      {strip.hours.map((tick) => (
        <g key={tick.hour}>
          <line
            x1={`${tick.left}%`}
            x2={`${tick.left}%`}
            y1="7"
            y2="13"
            className="stroke-border"
          />
          {tick.label && (
            <text
              x={`${tick.left}%`}
              y="28"
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[10px] tabular-nums"
            >
              {String(tick.hour).padStart(2, "0")}
            </text>
          )}
        </g>
      ))}
      {trades.map((trade, index) => (
        <circle
          key={trade.id}
          cx={`${strip.positions[index]}%`}
          cy="10"
          r="5"
          className={`stroke-2 stroke-background ${dotFill(trade)}`}
        />
      ))}
    </svg>
  );
}
