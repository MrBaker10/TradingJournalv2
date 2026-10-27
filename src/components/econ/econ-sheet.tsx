"use client";

import { useState } from "react";
import { MetricRow } from "@/components/dashboard/metric-row";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EconEventRow } from "@/db/queries/econ";
import { isPast } from "@/domain/econ";
import type { IsoDate } from "@/domain/streak";
import { formatEventDayLabel, formatEventTime } from "@/lib/time";
import { Figure, ImpactTag } from "./econ-table";

/** The open event and the day it is listed under in the user's zone. */
export interface EconSheetTarget {
  event: EconEventRow;
  date: IsoDate;
}

/**
 * One event's full data in the medium sheet (Design.md §3.4, §3.10), read
 * from its row: nothing is fetched, the feed is never called from here.
 */
export function EconSheet({
  target,
  timeZone,
  now,
  onClose,
}: {
  target: EconSheetTarget | null;
  timeZone: string;
  now: Date;
  onClose: () => void;
}) {
  // What the sheet shows, so it keeps showing it while it slides out.
  const [shown, setShown] = useState(target);
  if (target !== null && target.event.id !== shown?.event.id) setShown(target);
  const view = target ?? shown;

  return (
    <Sheet open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent size="medium" className="p-6">
        {view && (
          <div className="flex flex-col gap-6">
            <div className="flex min-h-10 flex-col gap-1 pr-10">
              <SheetTitle className="font-semibold text-lg">
                {view.event.title}
              </SheetTitle>
              <SheetDescription className="font-mono tabular-nums">
                {formatEventDayLabel(view.date)} ·{" "}
                {formatEventTime(view.event.occursAt, timeZone)} {timeZone}
              </SheetDescription>
            </div>
            <dl className="text-[13px]">
              <MetricRow label="Currency">{view.event.currency}</MetricRow>
              <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-1">
                <dt className="text-muted-foreground">Impact</dt>
                <dd>
                  <ImpactTag impact={view.event.impact} />
                </dd>
              </div>
              <MetricRow label="Forecast">
                <Figure value={view.event.forecast} />
              </MetricRow>
              <MetricRow label="Previous">
                <Figure value={view.event.previous} />
              </MetricRow>
              <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-1">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  {isPast(view.event.occursAt, now) ? "Released" : "Upcoming"}
                </dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-xs">
              From Forex Factory's weekly calendar, synced once a day.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
