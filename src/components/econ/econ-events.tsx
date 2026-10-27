"use client";

import { useState } from "react";
import type { EconEventRow } from "@/db/queries/econ";
import type { EconDay } from "@/domain/econ";
import { EconSheet, type EconSheetTarget } from "./econ-sheet";
import { EconTable } from "./econ-table";

/**
 * The calendar's table and the sheet a row opens. The open event is
 * component state, not the URL: nothing links to an event, and the daily
 * sync replaces every row and its id.
 */
export function EconEvents({
  days,
  timeZone,
  now,
}: {
  days: EconDay<EconEventRow>[];
  timeZone: string;
  now: Date;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  let target: EconSheetTarget | null = null;
  for (const day of days) {
    const event = day.events.find((candidate) => candidate.id === openId);
    if (event) target = { event, date: day.date };
  }

  return (
    <>
      <EconTable
        days={days}
        timeZone={timeZone}
        now={now}
        openId={target?.event.id ?? null}
        onOpen={setOpenId}
      />
      <EconSheet
        target={target}
        timeZone={timeZone}
        now={now}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}
