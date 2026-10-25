"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { Strategy } from "@/db/queries/strategies";
import { StrategyForm } from "./strategy-form";
import { StrategyRules } from "./strategy-rules";

interface StrategyManagerProps {
  strategies: Strategy[];
}

const NEW_BUTTON_CLASS =
  "flex h-11 items-center justify-center gap-2 rounded-ctl border border-white/12 bg-well px-4 text-fg text-sm transition-colors hover:border-cyan/35 focus-visible:outline-cyan";

// One form is open at a time: opening another closes the first unsaved,
// like the ledger's rows.
export function StrategyManager({ strategies }: StrategyManagerProps) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  function startCreating() {
    setEditingId(null);
    setCreating(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {creating ? (
        <section className="card-surface edge flex flex-col gap-4 p-5">
          <h2 className="cap">New strategy</h2>
          <StrategyForm initial={null} onClose={() => setCreating(false)} />
        </section>
      ) : strategies.length > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={startCreating}
            className={NEW_BUTTON_CLASS}
          >
            <Plus className="h-4 w-4 text-cyan" aria-hidden="true" />
            New strategy
          </button>
        </div>
      ) : (
        <section className="card-surface edge flex flex-col items-center gap-4 p-8 text-center">
          <p className="max-w-md text-fg-subtle text-sm">
            No strategies yet. Start with a name and write the rules down when
            you are ready.
          </p>
          <button
            type="button"
            onClick={startCreating}
            className={NEW_BUTTON_CLASS}
          >
            <Plus className="h-4 w-4 text-cyan" aria-hidden="true" />
            Create your first strategy
          </button>
        </section>
      )}

      {strategies.map((strategy) => (
        <section
          key={strategy.id}
          className="card-surface edge flex flex-col gap-4 p-5"
        >
          {editingId === strategy.id ? (
            <>
              <h2 className="cap">Edit strategy</h2>
              <StrategyForm
                initial={strategy}
                strategyId={strategy.id}
                onClose={() => setEditingId(null)}
              />
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium text-fg text-lg">{strategy.name}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditingId(strategy.id);
                  }}
                  className="shrink-0 rounded-ctl px-3 py-1.5 text-fg-muted text-sm transition-colors hover:text-fg focus-visible:outline-cyan"
                >
                  Edit
                </button>
              </div>
              <StrategyRules strategy={strategy} />
            </>
          )}
        </section>
      ))}
    </div>
  );
}
