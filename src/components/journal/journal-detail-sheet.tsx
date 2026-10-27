"use client";

import { Maximize2, Pencil } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { JournalTradeRow } from "@/db/queries/trades";
import type { DisplayCurrency } from "@/lib/money";
import { TradeDetailBody } from "./trade-detail-body";

type OpenEntry = (trade: JournalTradeRow, from: HTMLElement) => void;

const OpenEntryContext = createContext<OpenEntry | null>(null);

/** Opens an entry in the journal's detail sheet; null outside the journal. */
export function useOpenEntry(): OpenEntry | null {
  return useContext(OpenEntryContext);
}

const ACTION_CLASS = buttonVariants({
  variant: "outline",
  className: "h-10 lg:h-8",
});

/**
 * The journal's wide detail sheet (Design.md §3.3, §3.10). It shows the row
 * the card was rendered from, so opening it issues no query, and it is not in
 * the URL: the trade has its own page, one click away under "Open page". On
 * close, focus goes back to the card that opened it.
 */
export function JournalDetailSheet({
  currency,
  children,
}: {
  /** The display currency of the rows' `displayPnlCents` (display-currency). */
  currency: DisplayCurrency;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Kept after closing, so the sheet still has its content while it slides out.
  const [trade, setTrade] = useState<JournalTradeRow | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const openEntry = useCallback<OpenEntry>((next, from) => {
    opener.current = from;
    setTrade(next);
    setOpen(true);
  }, []);

  return (
    <OpenEntryContext.Provider value={openEntry}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent size="wide" finalFocus={opener}>
          {trade && (
            <div className="flex flex-col gap-4 p-4 lg:p-6">
              <div className="flex flex-wrap gap-2 pr-12">
                <Link href={`/journal/${trade.id}`} className={ACTION_CLASS}>
                  <Maximize2 aria-hidden="true" />
                  Open page
                </Link>
                <Link
                  href={`/journal/${trade.id}/edit`}
                  className={ACTION_CLASS}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Link>
              </div>
              <TradeDetailBody
                trade={trade}
                currency={currency}
                Title={SheetTitle}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </OpenEntryContext.Provider>
  );
}
