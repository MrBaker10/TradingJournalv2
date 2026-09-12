"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { JournalTradeRow as JournalTradeRowData } from "@/db/queries/trades";
import { centsToDollars } from "@/lib/money";

interface TradeRowProps {
  trade: JournalTradeRowData;
}

function resultLabel(trade: JournalTradeRowData): string {
  if (!trade.taken) return "Missed";
  return trade.result ?? "—";
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="cap">{label}</span>
      <span className="text-fg">{value}</span>
    </div>
  );
}

// Design.md §4.9: closed row is instrument tile + title line (instrument,
// direction, result/missed, grade) + meta line, and amount/R on the right.
// Missed setups get the same structure, never smaller or paler — the tile
// gradient is the only visual difference. Expanding (260ms) reveals the
// remaining trade fields that don't fit the header.
export function TradeRow({ trade }: TradeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const amount =
    trade.pnlCents !== null ? centsToDollars(trade.pnlCents) : null;
  const amountPositive = amount !== null && amount >= 0;
  const showWouldBeR = !trade.taken && trade.rMultiple !== null;
  const showR = trade.taken && trade.rMultiple !== null;

  return (
    <div className="card-surface edge relative transition-transform duration-150 hover:-translate-y-px hover:[box-shadow:var(--shadow-card),var(--shadow-neon-edge)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xs font-mono text-[11px] font-semibold text-white ${
            trade.taken
              ? "bg-[image:var(--gradient-info)]"
              : "bg-[image:var(--gradient-dark)]"
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
              {amountPositive ? "+" : ""}${amount.toFixed(2)}
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
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-white/8 border-t px-3 py-3 text-sm">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {trade.taken && (
                  <DetailField label="Contracts" value={trade.contracts} />
                )}
                <DetailField label="Entry time" value={trade.entryTime} />
                {trade.exitTime !== null && (
                  <DetailField label="Exit time" value={trade.exitTime} />
                )}
                <DetailField label="Entry" value={trade.entryPrice} />
                {trade.exitPrice !== null && (
                  <DetailField label="Exit" value={trade.exitPrice} />
                )}
                {trade.stopPrice !== null && (
                  <DetailField label="Stop" value={trade.stopPrice} />
                )}
                {trade.mfeR !== null && (
                  <DetailField label="MFE (R)" value={trade.mfeR} />
                )}
                {trade.maeR !== null && (
                  <DetailField label="MAE (R)" value={trade.maeR} />
                )}
                {trade.postExitMfeR !== null && (
                  <DetailField
                    label="Post-exit MFE (R)"
                    value={trade.postExitMfeR}
                  />
                )}
                {trade.entryModel && (
                  <DetailField label="Entry model" value={trade.entryModel} />
                )}
                {trade.felt && <DetailField label="Felt" value={trade.felt} />}
                {trade.taken && trade.byTheBook !== null && (
                  <DetailField
                    label="By the book"
                    value={trade.byTheBook ? "Yes" : "No"}
                  />
                )}
              </div>

              {trade.accounts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="cap">Accounts</span>
                  {trade.accounts.map((account) => (
                    <span
                      key={account.id}
                      className="flex items-center gap-1 rounded-xs bg-well px-1.5 py-0.5 text-fg-muted text-xs"
                    >
                      {account.name}
                      {account.isPractice && (
                        <span className="cap-practice rounded-xs px-1 py-0.5">
                          Practice
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {trade.notes && (
                <p className="text-fg-muted text-xs">{trade.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
