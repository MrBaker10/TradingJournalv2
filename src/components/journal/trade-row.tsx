import Link from "next/link";
import type { JournalTradeRow as JournalTradeRowData } from "@/db/queries/trades";
import { formatCents } from "@/lib/money";

interface TradeRowProps {
  trade: JournalTradeRowData;
}

function resultLabel(trade: JournalTradeRowData): string {
  if (!trade.taken) return "Missed";
  return trade.result ?? "—";
}

// Design.md §4.9: instrument tile + title line (instrument, direction,
// result/missed, grade) + meta line, and amount/R on the right. Missed setups
// get the same structure, never smaller or paler — the tile gradient is the
// only visual difference.
//
// The row used to expand in place. It is now a link to /journal/[id], because
// the detail page carries things the row never could: confluences, mistakes,
// notes at full length, chart previews, and the way into editing. §4.9 was
// rewritten with this slice; the hover treatment is the part that stayed.
export function TradeRow({ trade }: TradeRowProps) {
  const amount =
    trade.pnlCents !== null
      ? formatCents(trade.pnlCents, { signed: true })
      : null;
  const amountPositive = trade.pnlCents !== null && trade.pnlCents >= 0;
  const showWouldBeR = !trade.taken && trade.rMultiple !== null;
  const showR = trade.taken && trade.rMultiple !== null;

  return (
    <Link
      href={`/journal/${trade.id}`}
      className="card-surface edge relative flex w-full items-center gap-3 p-3 text-left transition-transform duration-150 hover:-translate-y-px hover:[box-shadow:var(--shadow-card),var(--shadow-neon-edge)]"
    >
      {/* Design.md §4.9 and §4.14: both tiles are built the same way — calm
          fill plus a 1px inset ring — and only the colour differs. A missed
          setup is not rendered smaller, paler or lower down; it is a
          differently labelled entry, not a lesser one. */}
      <div
        className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xs font-mono text-[11px] font-semibold ${
          trade.taken
            ? "bg-[image:var(--gradient-info-soft)] text-cyan shadow-[var(--shadow-info-soft)]"
            : "bg-[image:var(--gradient-dark-soft)] text-fg-muted shadow-[var(--shadow-dark-soft)]"
        }`}
      >
        {trade.instrumentSymbol}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-fg">
            {trade.instrumentSymbol}
          </span>
          <span className="cap rounded-xs bg-well px-1.5 py-0.5">
            {trade.direction === "long" ? "Long" : "Short"}
          </span>
          <span className="cap rounded-xs bg-well px-1.5 py-0.5">
            {resultLabel(trade)}
          </span>
          {trade.grade && (
            <span className="cap rounded-xs bg-well px-1.5 py-0.5">
              Grade {trade.grade}
            </span>
          )}
          {/* A count, not the badges themselves: spelling out five
              confluences would make the row two lines tall on some entries and
              one on others, and §4.9's title line is meant to be scannable.
              The badges are on the detail page. */}
          {trade.confluences.length > 0 && (
            <span className="cap rounded-xs bg-well px-1.5 py-0.5">
              {trade.confluences.length}{" "}
              {trade.confluences.length === 1 ? "Confluence" : "Confluences"}
            </span>
          )}
        </div>
        <span className="truncate text-xs text-fg-subtle">
          {[trade.tradeDate, trade.session, trade.setupType]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {amount !== null ? (
          <span
            className={`font-mono text-sm ${
              amountPositive ? "text-success-fg" : "text-danger-fg"
            }`}
          >
            {amount}
          </span>
        ) : (
          <span className="font-mono text-sm text-fg-subtle">—</span>
        )}
        {showR && (
          <span className="text-fg-muted text-xs">
            {(trade.rMultiple as number) >= 0 ? "+" : ""}
            {(trade.rMultiple as number).toFixed(2)}R
          </span>
        )}
        {showWouldBeR && (
          <span className="text-fg-subtle text-xs">
            {(trade.rMultiple as number) >= 0 ? "+" : ""}
            {(trade.rMultiple as number).toFixed(2)}R would-be
          </span>
        )}
      </div>
    </Link>
  );
}
