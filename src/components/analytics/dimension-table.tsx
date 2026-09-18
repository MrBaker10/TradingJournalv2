"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ValueBar } from "@/components/ui/value-bar";
import { DIMENSION_ROW_LIMIT, type DimensionRow } from "@/domain/analytics";
import { formatCents } from "@/lib/money";

interface DimensionTableProps {
  title: string;
  rows: DimensionRow[];
  /** The line under the heading when a trade can land in several rows. */
  note?: string;
}

const EMPTY = "—";

// A bucket is keyed by its label, except the empty one: a free-text bucket
// could in principle be named "Not set" and collide with it.
function rowKey(row: DimensionRow): string {
  return row.isNotSet ? "\u0000not-set" : row.label;
}

function moneyClass(cents: number): string {
  if (cents === 0) return "text-fg";
  return cents > 0 ? "text-success-fg" : "text-danger-fg";
}

function Row({ row }: { row: DimensionRow }) {
  return (
    <li className="flex flex-col gap-1.5 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`truncate text-sm ${
            row.isNotSet ? "text-fg-subtle italic" : "text-fg"
          }`}
        >
          {row.label}
        </span>
        <span className="flex shrink-0 items-baseline gap-3 font-mono text-[13px] tabular-nums">
          <span className="w-8 text-right text-fg-muted">{row.trades}</span>
          <span className="w-10 text-right text-fg-muted">
            {row.winRate === null ? EMPTY : `${Math.round(row.winRate * 100)}%`}
          </span>
          <span className={`w-24 text-right ${moneyClass(row.netPnlCents)}`}>
            {formatCents(row.netPnlCents, { signed: true })}
          </span>
          <span className="w-12 text-right text-fg-muted">
            {row.avgR === null ? EMPTY : `${row.avgR.toFixed(2)}R`}
          </span>
        </span>
      </div>
      {/* Design.md §1: a money bar states a magnitude, it does not applaud
          one — semantic colour, no gradient, no glow. */}
      <ValueBar
        ratio={row.barRatio}
        tone={row.netPnlCents < 0 ? "loss" : "gain"}
      />
    </li>
  );
}

// One dimension as a card: the buckets down the left, the four figures of
// project-overview.md §F down the right, and a bar that scales the bucket
// against the strongest one in this card.
//
// Eight rows are shown; the rest sit behind a disclosure rather than being
// cut off, because "nothing disappears silently" applies to a long dimension
// as much as it does to a practice-only trade in the journal.
export function DimensionTable({ title, rows, note }: DimensionTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = rows.slice(0, DIMENSION_ROW_LIMIT);
  const overflow = rows.slice(DIMENSION_ROW_LIMIT);

  return (
    <section className="card-surface edge flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="cap cap-neon">{title}</h2>
        {note ? <p className="text-[11.5px] text-fg-subtle">{note}</p> : null}
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-fg-subtle text-sm">
          Nothing logged in this range yet.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 border-white/8 border-b pb-1.5">
            <span className="cap">Bucket</span>
            <span className="flex shrink-0 gap-3">
              <span className="cap w-8 text-right">Trades</span>
              <span className="cap w-10 text-right">Win</span>
              <span className="cap w-24 text-right">Net P&amp;L</span>
              <span className="cap w-12 text-right">Avg R</span>
            </span>
          </div>

          <ul className="flex flex-col divide-y divide-white/6">
            {visible.map((row) => (
              <Row key={rowKey(row)} row={row} />
            ))}
          </ul>

          {/* Design.md §5: 260ms disclosure, the same one the journal row and
              the review panel use. The rows are always rendered on the server;
              only their height moves. */}
          <AnimatePresence initial={false}>
            {expanded && overflow.length > 0 && (
              <motion.div
                key="overflow"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.26 }}
                className="overflow-hidden"
              >
                <ul className="flex flex-col divide-y divide-white/6 border-white/6 border-t">
                  {overflow.map((row) => (
                    <Row key={rowKey(row)} row={row} />
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {overflow.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              className="w-full rounded-xs py-1 text-fg-muted text-xs transition-colors duration-150 hover:text-cyan"
            >
              {expanded ? "Show less" : `Show all (${rows.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
