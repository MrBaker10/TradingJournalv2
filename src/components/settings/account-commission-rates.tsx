"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { FIELD_CLASS } from "@/components/ui/field-class";

export interface CommissionRateData {
  instrumentId: number;
  instrumentSymbol: string;
  perSideCents: number;
}

export interface InstrumentOption {
  id: number;
  symbol: string;
}

export interface CommissionDraft {
  key: string;
  instrumentId: string;
  perSide: string;
}

export function AccountCommissionRates({
  rates,
  instruments,
  onChange,
  errors,
}: {
  rates: CommissionDraft[];
  instruments: InstrumentOption[];
  onChange: (rates: CommissionDraft[]) => void;
  errors: Record<string, string>;
}) {
  function update(key: string, values: Partial<CommissionDraft>) {
    onChange(
      rates.map((rate) => (rate.key === key ? { ...rate, ...values } : rate)),
    );
  }
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // A rejected save must show its rate errors, so they keep the panel open.
  const expanded =
    open ||
    Object.keys(errors).some((key) => key.startsWith("commissionRates"));
  return (
    <div className="border-t border-white/8 pt-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-medium text-fg focus-visible:outline-cyan"
      >
        <span>
          Commission{" "}
          <span className="ml-2 font-normal text-fg-subtle">
            {rates.length
              ? `${rates.length} ${rates.length === 1 ? "rate" : "rates"}`
              : "Optional"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-fg-muted transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            key="rates"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-fg-muted">
              USD per contract and side. Used when an import has no commission.
              Saved trades keep their existing commissions.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {rates.map((rate, index) => (
                <div
                  key={rate.key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] items-start gap-3"
                >
                  <div>
                    <label
                      htmlFor={`rate-${rate.key}-instrument`}
                      className="mb-1.5 block text-xs text-fg-muted"
                    >
                      Instrument
                    </label>
                    <select
                      id={`rate-${rate.key}-instrument`}
                      value={rate.instrumentId}
                      onChange={(event) =>
                        update(rate.key, { instrumentId: event.target.value })
                      }
                      className={FIELD_CLASS}
                      aria-invalid={
                        !!errors[`commissionRates.${index}.instrumentId`]
                      }
                      aria-describedby={
                        errors[`commissionRates.${index}.instrumentId`]
                          ? `rate-${rate.key}-instrument-error`
                          : undefined
                      }
                    >
                      <option value="">Select instrument</option>
                      {instruments.map((instrument) => (
                        <option
                          key={instrument.id}
                          value={instrument.id}
                          disabled={rates.some(
                            (other) =>
                              other.key !== rate.key &&
                              other.instrumentId === String(instrument.id),
                          )}
                        >
                          {instrument.symbol}
                        </option>
                      ))}
                    </select>
                    <p
                      id={`rate-${rate.key}-instrument-error`}
                      className="mt-1 text-xs text-danger-fg"
                    >
                      {errors[`commissionRates.${index}.instrumentId`]}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor={`rate-${rate.key}-amount`}
                      className="mb-1.5 block text-xs text-fg-muted"
                    >
                      Per side (USD)
                    </label>
                    <input
                      id={`rate-${rate.key}-amount`}
                      inputMode="decimal"
                      value={rate.perSide}
                      onChange={(event) =>
                        update(rate.key, { perSide: event.target.value })
                      }
                      placeholder="0.50"
                      className={`${FIELD_CLASS} font-mono tabular-nums`}
                      aria-invalid={
                        !!errors[`commissionRates.${index}.perSide`]
                      }
                      aria-describedby={
                        errors[`commissionRates.${index}.perSide`]
                          ? `rate-${rate.key}-amount-error`
                          : undefined
                      }
                    />
                    <p
                      id={`rate-${rate.key}-amount-error`}
                      className="mt-1 text-xs text-danger-fg"
                    >
                      {errors[`commissionRates.${index}.perSide`]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(rates.filter((other) => other.key !== rate.key))
                    }
                    aria-label={`Remove commission rate ${index + 1}`}
                    className="mt-6 flex h-11 w-11 items-center justify-center rounded-ctl text-fg-muted transition-colors hover:bg-white/5 hover:text-danger-fg focus-visible:outline-cyan"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  onChange([
                    ...rates,
                    { key: crypto.randomUUID(), instrumentId: "", perSide: "" },
                  ])
                }
                className="flex min-h-11 w-fit items-center gap-2 rounded-ctl px-3 text-sm text-cyan transition-colors hover:bg-white/5 focus-visible:outline-cyan"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add rate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
