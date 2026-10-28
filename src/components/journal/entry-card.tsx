"use client";

import Link from "next/link";
import type { JournalTradeRow } from "@/db/queries/trades";
import { moneyTone, SIGN_TEXT, signOf } from "@/lib/dashboard/sign-tone";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { useOpenEntry } from "./journal-detail-sheet";

/** Confluences shown on the card; the rest are counted. */
const VISIBLE_CONFLUENCES = 4;

function signedR(r: number): string {
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
}

/**
 * One entry of the journal (Design.md §3.3), recognisable without opening it:
 * the first screenshot, the notes' opening lines, confluences and mistakes. A
 * card without a screenshot has no image field. A missed setup is the same
 * card, marked "Missed setup", and shows no P&L and no R.
 *
 * The whole card links to the entry's page and holds no actions of its own.
 * Inside the journal a plain click opens the detail sheet instead; a click
 * with a modifier key or the middle button still opens the page.
 */
export function EntryCard({
  trade,
  currency,
  lead,
}: {
  trade: JournalTradeRow;
  /** The display currency of `displayPnlCents` (display-currency). */
  currency: DisplayCurrency;
  /**
   * What the card starts with: the entry time inside a day, which already
   * names the date, otherwise the trade date.
   */
  lead: "time" | "date";
}) {
  const shot = trade.screenshots[0];
  const pnl = trade.taken ? trade.displayPnlCents : null;
  const r = trade.taken ? trade.rMultiple : null;
  const meta = [
    trade.setupType,
    trade.session,
    trade.grade && `Grade ${trade.grade}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const hiddenConfluences = trade.confluences.length - VISIBLE_CONFLUENCES;
  const openEntry = useOpenEntry();

  return (
    <Link
      href={`/journal/${trade.id}`}
      onClick={(event) => {
        if (
          !openEntry ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        openEntry(trade, event.currentTarget);
      }}
      className="flex gap-3 rounded-lg border bg-card p-3 text-card-foreground outline-none transition-[translate,background-color,border-color] duration-150 hover:-translate-y-px hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-4"
    >
      {shot && (
        <div className="aspect-video w-24 shrink-0 self-start overflow-hidden rounded-md bg-muted sm:w-40">
          {/* biome-ignore lint/performance/noImgElement: signed storage URL, not something next/image can optimize */}
          <img
            src={shot.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
            {lead === "time" ? trade.entryTime.slice(0, 5) : trade.tradeDate}
          </span>
          <span className="truncate font-medium">{trade.instrumentSymbol}</span>
          <span className="shrink-0 text-muted-foreground text-sm">
            {trade.direction === "long" ? "Long" : "Short"}
          </span>
          {!trade.taken && (
            <span className="shrink-0 rounded-sm bg-muted px-1.5 text-[11px]">
              Missed setup
            </span>
          )}
          {pnl !== null && (
            <span
              className={`ml-auto shrink-0 font-mono text-sm tabular-nums ${moneyTone(pnl)}`}
            >
              {formatCents(pnl, { signed: true, currency })}
            </span>
          )}
        </div>
        {(meta || r !== null) && (
          <div className="flex min-w-0 gap-2 text-muted-foreground text-xs">
            <span className="truncate">{meta}</span>
            {r !== null && (
              <span
                className={`ml-auto shrink-0 font-mono tabular-nums ${SIGN_TEXT[signOf(r)]}`}
              >
                {signedR(r)}
              </span>
            )}
          </div>
        )}
        {trade.notes && (
          <p className="line-clamp-2 text-[13px] text-foreground/80">
            {trade.notes}
          </p>
        )}
        {(trade.confluences.length > 0 || trade.mistakes.length > 0) && (
          <ul className="flex flex-wrap gap-1 pt-1 text-[11px]">
            {trade.confluences.slice(0, VISIBLE_CONFLUENCES).map((item) => (
              <li
                key={item.id}
                className="rounded-sm bg-secondary px-1.5 py-0.5"
              >
                {item.label}
              </li>
            ))}
            {hiddenConfluences > 0 && (
              <li className="px-1 py-0.5 text-muted-foreground">
                +{hiddenConfluences}
                <span className="sr-only"> more confluences</span>
              </li>
            )}
            {trade.mistakes.map((item) => (
              <li
                key={item.id}
                className="rounded-sm border border-dashed border-input px-1.5 py-0.5"
              >
                <span className="sr-only">Mistake: </span>
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
