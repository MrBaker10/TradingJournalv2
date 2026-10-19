import type { LedgerEntryRow } from "@/db/queries/ledger";
import { formatCents } from "@/lib/money";
import { formatDateWithYear } from "@/lib/time";
import { ledgerEntryLabel } from "./ledger-labels";

interface LedgerListProps {
  entries: LedgerEntryRow[];
}

/**
 * The amount as entered, in USD. A payout reads as a gain, an expense as a
 * loss; zero carries no sign. Real money: semantic colour, never a glow
 * (Design.md §4.25).
 */
function LedgerAmount({ entry }: { entry: LedgerEntryRow }) {
  if (entry.amountCents === 0) {
    return <span className="text-fg-muted">{formatCents(0)}</span>;
  }
  return entry.kind === "payout" ? (
    <span className="text-success-fg">
      {formatCents(entry.amountCents, { signed: true })}
    </span>
  ) : (
    <span className="text-danger-fg">{formatCents(-entry.amountCents)}</span>
  );
}

/** An archived account keeps its name: the entry still belongs to it. */
function LedgerAccountName({ name }: { name: string | null }) {
  return name === null ? (
    <span className="text-fg-subtle">No account</span>
  ) : (
    <span className="text-fg-muted" title={name}>
      {name}
    </span>
  );
}

// Design.md §4.25, with the row layout from §4.16.
export function LedgerList({ entries }: LedgerListProps) {
  return (
    <section className="card-surface edge flex flex-col gap-3 p-5">
      <h2 className="cap">Entries</h2>

      {entries.length === 0 ? (
        <p className="mx-auto max-w-md py-6 text-center text-fg-subtle text-sm">
          Nothing in the ledger yet. Add what prop trading costs you —
          evaluations, resets, activations, subscriptions, data — and every
          payout you receive.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/6">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline justify-between gap-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-baseline gap-3">
                <span className="w-24 shrink-0 font-mono text-[13px] text-fg-muted tabular-nums">
                  {formatDateWithYear(entry.entryDate)}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-fg text-sm">
                    {ledgerEntryLabel(entry.kind, entry.category)}
                  </span>
                  {/* Below `sm` the account joins the note's line. */}
                  <span
                    className="truncate text-fg-subtle text-xs sm:hidden"
                    title={entry.note ?? undefined}
                  >
                    <LedgerAccountName name={entry.accountName} />
                    {entry.note ? ` · ${entry.note}` : null}
                  </span>
                  {entry.note ? (
                    <span
                      className="hidden truncate text-fg-subtle text-xs sm:block"
                      title={entry.note}
                    >
                      {entry.note}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="hidden w-40 shrink-0 truncate text-sm sm:block">
                <LedgerAccountName name={entry.accountName} />
              </span>
              {/* Fixed width, so the account column lines up across rows. */}
              <span className="w-28 shrink-0 text-right font-mono text-[13px] tabular-nums">
                <LedgerAmount entry={entry} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
