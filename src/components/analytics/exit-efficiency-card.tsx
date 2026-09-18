import type { ExecutionSummaryRow } from "@/db/queries/analytics";

interface ExitEfficiencyCardProps {
  summary: ExecutionSummaryRow[];
}

// How much of the available move the exit actually kept, from the manual
// post-exit MFE field.
//
// Winners only: a losing trade has no efficiency worth printing, and the
// denominator would turn one into a number that reads like an answer.
//
// Both figures are hypothetical — the R left on the table was never realised —
// so neither is ever shown in green (Design.md §4.9). The captured share is a
// process value and may glow; the R beside it stays plain.
export function ExitEfficiencyCard({ summary }: ExitEfficiencyCardProps) {
  const winners = summary.find((entry) => entry.outcome === "winner");
  const share = winners?.capturedShare ?? null;
  const capturedTrades = winners?.capturedTrades ?? 0;
  const leftOnTable = winners?.avgLeftOnTableR ?? null;
  const leftTrades = winners?.leftOnTableTrades ?? 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="ml-2 flex flex-col gap-1">
        <h2 className="cap cap-neon">Exit efficiency</h2>
        <p className="text-[11.5px] text-fg-subtle">
          Of the move that was there, how much the exit kept. Winners only, and
          only where a post-exit MFE was recorded.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="card-surface edge flex flex-col gap-4 p-5">
          {capturedTrades === 0 && leftTrades === 0 ? (
            <p className="py-4 text-center text-fg-subtle text-sm">
              No post-exit MFE recorded in this range. It is a manual field and
              only appears when a trade has a stop price.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="cap">Captured</span>
                {/* A share of a move is a process figure, not money, so it
                    takes the neon treatment the P&L columns may not. */}
                <span className="text-glow font-mono text-[21px] font-bold tabular-nums">
                  {share === null ? "—" : `${Math.round(share * 100)}%`}
                </span>
                <span className="min-h-[15px] text-[11.5px] text-fg-subtle">
                  over {capturedTrades} winner
                  {capturedTrades === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="cap">Left on the table</span>
                {/* Never realised, so never green — §4.9. */}
                <span className="font-mono text-[21px] text-fg font-bold tabular-nums">
                  {leftOnTable === null ? "—" : `${leftOnTable.toFixed(2)}R`}
                </span>
                <span className="min-h-[15px] text-[11.5px] text-fg-subtle">
                  avg after the exit
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
