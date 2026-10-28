"use client";

import { Plus, Trash2 } from "lucide-react";
import { FieldError, FieldLabel } from "@/components/trades/form-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HELP_TEXT, PART_HEADING, SELECT_CLASS } from "./fields";

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

/**
 * The commissions part of the account editor (Design.md §3.8), always open:
 * the sheet stacks every part, so there is nothing to disclose.
 */
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
  return (
    <section
      aria-labelledby="account-commissions"
      className="flex flex-col gap-4 border-t pt-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id="account-commissions" className={PART_HEADING}>
          Commissions
        </h3>
        <p className={HELP_TEXT}>
          USD per contract and side. Used when an import has no commission.
          Saved trades keep their existing commissions.
        </p>
      </div>
      {rates.length === 0 && (
        <p className="text-muted-foreground text-sm">No rates yet.</p>
      )}
      {rates.map((rate, index) => {
        const instrumentError = errors[`commissionRates.${index}.instrumentId`];
        const amountError = errors[`commissionRates.${index}.perSide`];
        return (
          <div
            key={rate.key}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] items-start gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor={`rate-${rate.key}-instrument`}>
                Instrument
              </FieldLabel>
              <select
                id={`rate-${rate.key}-instrument`}
                value={rate.instrumentId}
                onChange={(event) =>
                  update(rate.key, { instrumentId: event.target.value })
                }
                className={SELECT_CLASS}
                aria-invalid={instrumentError ? true : undefined}
                aria-describedby={
                  instrumentError
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
              <FieldError
                id={`rate-${rate.key}-instrument-error`}
                message={instrumentError}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor={`rate-${rate.key}-amount`}>
                Per side (USD)
              </FieldLabel>
              <Input
                id={`rate-${rate.key}-amount`}
                inputMode="decimal"
                value={rate.perSide}
                onChange={(event) =>
                  update(rate.key, { perSide: event.target.value })
                }
                placeholder="0.50"
                className="h-10 font-mono tabular-nums"
                aria-invalid={amountError ? true : undefined}
                aria-describedby={
                  amountError ? `rate-${rate.key}-amount-error` : undefined
                }
              />
              <FieldError
                id={`rate-${rate.key}-amount-error`}
                message={amountError}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={() =>
                onChange(rates.filter((other) => other.key !== rate.key))
              }
              aria-label={`Remove commission rate ${index + 1}`}
              className="mt-5 size-10 text-muted-foreground hover:text-negative"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() =>
          onChange([
            ...rates,
            { key: crypto.randomUUID(), instrumentId: "", perSide: "" },
          ])
        }
        className="h-10 w-fit"
      >
        <Plus aria-hidden="true" />
        Add rate
      </Button>
    </section>
  );
}
