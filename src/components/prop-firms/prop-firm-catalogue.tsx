"use client";

import { useState } from "react";
import type { PropFirmRow } from "@/db/queries/prop-firms";
import {
  accountNamesFor,
  type CatalogueCard,
  type ProgramLinkName,
} from "@/lib/prop-firms/cards";
import type { PropFirmsState } from "@/lib/prop-firms/href";
import { FirmSheet } from "./firm-sheet";
import { PropFirmCard } from "./prop-firm-card";

/** The cards and the firm sheet they open (Design.md §3.9). */
export function PropFirmCatalogue({
  cards,
  allRows,
  links,
  state,
}: {
  cards: CatalogueCard<PropFirmRow>[];
  allRows: PropFirmRow[];
  links: ProgramLinkName[];
  state: PropFirmsState;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <>
      {cards.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground text-sm">
          No program matches. Size, search and tags narrow together; pick Any
          size or fewer tags to see more.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <PropFirmCard
              key={card.row.program.id}
              row={card.row}
              accountNames={card.accountNames}
              state={state}
              onOpen={setOpenId}
            />
          ))}
        </div>
      )}
      <FirmSheet
        openId={openId}
        rows={allRows}
        accountNamesFor={(programId) => accountNamesFor(links, programId)}
        state={state}
        onOpenChange={setOpenId}
      />
    </>
  );
}
