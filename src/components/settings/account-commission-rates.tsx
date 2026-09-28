"use client";

import { ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { removeCommissionRate, setCommissionRate } from "@/actions/accounts";
import { InlineMessage } from "@/components/ui/inline-message";
import { formatCentsPlain } from "@/lib/money";
import { setCommissionRateSchema } from "@/schemas/accounts";

export interface CommissionRateData {
  instrumentId: number;
  instrumentSymbol: string;
  /** USD per contract and side, in integer cents. */
  perSideCents: number;
}

export interface InstrumentOption {
  id: number;
  symbol: string;
}

interface AccountCommissionRatesProps {
  accountId: number;
  rates: CommissionRateData[];
  instruments: InstrumentOption[];
}

/**
 * The per-side rates an account pays, collapsed by default (decided
 * 2026-09-28, commissions). A rate only fills in where no import file said
 * what was charged, and changing it never touches a stored commission.
 */
export function AccountCommissionRates({
  accountId,
  rates,
  instruments,
}: AccountCommissionRatesProps) {
  const [open, setOpen] = useState(false);
  const [instrumentId, setInstrumentId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelId = `account-commission-${accountId}`;

  function handleSet() {
    const parsed = setCommissionRateSchema.safeParse({
      accountId,
      instrumentId: instrumentId === "" ? undefined : instrumentId,
      perSide: amount.trim() === "" ? undefined : Number(amount),
    });
    if (!parsed.success) {
      setError(
        instrumentId === ""
          ? "Pick an instrument"
          : parsed.error.issues[0].message,
      );
      return;
    }

    startTransition(async () => {
      const result = await setCommissionRate(parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      setInstrumentId("");
      setAmount("");
    });
  }

  function handleRemove(rateInstrumentId: number) {
    startTransition(async () => {
      const result = await removeCommissionRate({
        accountId,
        instrumentId: rateInstrumentId,
      });
      setError(result.success ? null : result.error);
    });
  }

  return (
    <div className="flex flex-col border-white/8 border-t pt-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex h-10 items-center justify-between gap-3 text-left"
      >
        <span className="flex flex-col">
          <span className="text-xs text-fg-muted">Commission</span>
          <span className="text-xs text-fg-subtle">
            {rates.length === 0
              ? "No rates set"
              : `${rates.length} ${rates.length === 1 ? "rate" : "rates"} set`}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-fg-muted transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="rates"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-xs text-fg-subtle">
                USD per contract and side. Used where an import file carries no
                commission; saved trades keep theirs.
              </span>

              {rates.length > 0 && (
                <ul className="flex flex-col">
                  {rates.map((rate) => (
                    <li
                      key={rate.instrumentId}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="font-mono text-fg text-sm">
                        {rate.instrumentSymbol}
                      </span>
                      <span className="ml-auto font-mono text-fg-muted text-sm tabular-nums">
                        {formatCentsPlain(rate.perSideCents)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove the ${rate.instrumentSymbol} rate`}
                        title="Remove rate"
                        disabled={isPending}
                        onClick={() => handleRemove(rate.instrumentId)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-2">
                <label htmlFor={`${panelId}-instrument`} className="sr-only">
                  Instrument
                </label>
                <select
                  id={`${panelId}-instrument`}
                  value={instrumentId}
                  onChange={(event) =>
                    setInstrumentId(
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  disabled={isPending}
                  className="h-9 min-w-0 flex-1 rounded-ctl border border-white/12 bg-well px-2 text-sm text-fg transition-colors duration-200 hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60"
                >
                  <option value="">Instrument</option>
                  {instruments.map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>
                      {instrument.symbol}
                    </option>
                  ))}
                </select>
                <label htmlFor={`${panelId}-amount`} className="sr-only">
                  Commission per side in USD
                </label>
                <input
                  id={`${panelId}-amount`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSet();
                  }}
                  placeholder="0.50"
                  disabled={isPending}
                  className="h-9 w-20 shrink-0 rounded-ctl border border-white/12 bg-well px-2 text-right font-mono text-sm text-fg tabular-nums transition-colors duration-200 placeholder:text-fg-placeholder hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSet}
                  className="flex h-10 shrink-0 items-center rounded-xs px-2 text-xs text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
                >
                  Set
                </button>
              </div>
              <InlineMessage message={error} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
