"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { PriceBandChart } from "@/components/journal/price-band";
import {
  CardChoice,
  ChipGroup,
  Chips,
  Choice,
  FieldError,
  FieldLabel,
  PopCheck,
  TextField,
} from "@/components/trades/form-blocks";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import type { ConfluenceTagGroup, JournalTradeRow } from "@/db/queries/trades";
import {
  type CommissionSource,
  commissionOnSave,
  type StoredCommission,
} from "@/domain/commission";
import { isRateCurrency } from "@/domain/fx";
import { groupByAssetClass } from "@/domain/instruments";
import { calculatePnl } from "@/domain/pnl";
import type { PriceBandInput } from "@/domain/price-band";
import { formatCents, formatCentsPlain, type MoneyCurrency } from "@/lib/money";
import { parseNumber, type TradeFormState } from "@/lib/trades/form-steps";
import type { StrategyOption } from "@/lib/trades/strategy-options";
import { cn } from "@/lib/utils";
import {
  entryModelEnum,
  feltEnum,
  gradeEnum,
  resultEnum,
  sessionEnum,
  setupTypeEnum,
} from "@/schemas/trades";

export interface TradeFormData {
  instruments: {
    id: number;
    symbol: string;
    name: string;
    pointValue: string;
    assetClass: string;
    profitCurrency: string;
  }[];
  strategies: StrategyOption[];
  accounts: {
    id: number;
    name: string;
    isPractice?: boolean;
    /**
     * Archived accounts only reach this list when the trade being edited is
     * already on them (listAssignableAccounts). They stay togglable so the
     * assignment can be removed; adding one elsewhere is refused on the server.
     */
    isArchived?: boolean;
  }[];
  /** An account's per-side rate for one instrument, USD cents. */
  commissionRates: {
    accountId: number;
    instrumentId: number;
    perSideCents: number;
  }[];
  confluenceGroups: ConfluenceTagGroup[];
  mistakeTags: { id: number; label: string }[];
}

export interface StepProps {
  data: TradeFormData;
  state: TradeFormState;
  update: (patch: Partial<TradeFormState>) => void;
  errors: Record<string, string>;
  /** A required field the trader tried to move past while empty. */
  isMissing: (name: string) => boolean;
  editTrade: JournalTradeRow | null;
  disabled: boolean;
}

const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none transition-colors duration-150 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-negative/70";

export function StepWhat({
  data,
  state,
  update,
  errors,
  isMissing,
  disabled,
}: StepProps) {
  const instrumentGroups = useMemo(
    () => groupByAssetClass(data.instruments),
    [data.instruments],
  );
  const instrumentInvalid = isMissing("Instrument") || !!errors.instrumentId;
  return (
    <div className="flex flex-col gap-7">
      <CardChoice
        label="Taken or missed"
        value={state.taken ? "taken" : "missed"}
        disabled={disabled}
        onChange={(value) => update({ taken: value === "taken" })}
        options={[
          { value: "taken", title: "Taken", hint: "You executed it" },
          {
            value: "missed",
            title: "Missed setup",
            hint: "Seen, not taken. It counts too",
          },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <FieldLabel htmlFor="instrumentId" required>
            Instrument
          </FieldLabel>
          <select
            id="instrumentId"
            required
            value={state.instrumentId}
            disabled={disabled}
            aria-invalid={instrumentInvalid || undefined}
            onChange={(event) => update({ instrumentId: event.target.value })}
            className={selectClass}
          >
            <option value="">Choose…</option>
            {instrumentGroups.map((group) => (
              <optgroup key={group.assetClass} label={group.label}>
                {group.instruments.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.symbol} — {option.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldError message={errors.instrumentId} />
        </div>
        <TextField
          id="tradeDate"
          label="Date"
          type="date"
          required
          value={state.tradeDate}
          disabled={disabled}
          invalid={isMissing("Date")}
          error={errors.tradeDate}
          onChange={(tradeDate) => update({ tradeDate })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel required>Direction</FieldLabel>
        <CardChoice
          label="Direction"
          value={state.direction}
          disabled={disabled}
          invalid={isMissing("Direction") || !!errors.direction}
          onChange={(direction) => update({ direction })}
          options={[
            {
              value: "long",
              title: "Long",
              hint: "Bought first",
              icon: <ArrowUpRight className="size-4" aria-hidden="true" />,
            },
            {
              value: "short",
              title: "Short",
              hint: "Sold first",
              icon: <ArrowDownRight className="size-4" aria-hidden="true" />,
            },
          ]}
        />
        <FieldError message={errors.direction} />
      </div>
      {/* Copy-trading: a taken trade sits on one or more accounts; a missed
          setup was never executed, so it has none. */}
      {state.taken && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel required>Accounts</FieldLabel>
          <Chips
            label="Accounts"
            items={data.accounts.map((account) => ({
              id: account.id,
              label: account.name,
              practice: account.isPractice,
              archived: account.isArchived,
            }))}
            selected={state.accountIds}
            disabled={disabled}
            invalid={isMissing("Accounts") || !!errors.accountIds}
            onChange={(accountIds) => update({ accountIds })}
          />
          <FieldError message={errors.accountIds} />
        </div>
      )}
    </div>
  );
}

/** Where the amount in an account's commission field comes from. */
const COMMISSION_HINTS: Record<CommissionSource, string> = {
  file: "From the import file",
  rate: "From the account's rate",
  manual: "Typed",
};

function useLivePnl(data: TradeFormData, state: TradeFormState) {
  const instrument = data.instruments.find(
    (candidate) => candidate.id === Number(state.instrumentId),
  );
  return useMemo(() => {
    if (!state.taken || !instrument || state.direction === "") return null;
    const entryPrice = parseNumber(state.entryPrice);
    const exitPrice = parseNumber(state.exitPrice);
    const contracts = parseNumber(state.contracts);
    if (
      entryPrice === undefined ||
      exitPrice === undefined ||
      contracts === undefined
    ) {
      return null;
    }
    try {
      const pnl = calculatePnl({
        direction: state.direction,
        entryPrice,
        exitPrice,
        contracts,
        pointValue: Number(instrument.pointValue),
        stopPrice: parseNumber(state.stopPrice),
      });
      // Before saving the trade date's rate is not known in the browser, so
      // an instrument settling in another currency shows in that currency.
      const currency: MoneyCurrency = isRateCurrency(instrument.profitCurrency)
        ? instrument.profitCurrency
        : "USD";
      return { ...pnl, currency };
    } catch {
      return null;
    }
  }, [
    state.taken,
    state.direction,
    state.entryPrice,
    state.exitPrice,
    state.contracts,
    state.stopPrice,
    instrument,
  ]);
}

function signTone(value: number): string {
  if (value === 0) return "text-muted-foreground";
  return value > 0 ? "text-positive" : "text-negative";
}

export function StepExecution(props: StepProps) {
  const { state, update, errors, isMissing, disabled } = props;
  const live = useLivePnl(props.data, state);
  // Live P&L and R show only while the execution fields are being typed in
  // (Design.md §3.5): information while it is useful, never a reward at rest.
  const [typing, setTyping] = useState(false);
  const fields = useRef<HTMLFieldSetElement>(null);

  const entry = parseNumber(state.entryPrice);
  const stop = parseNumber(state.stopPrice);
  const band: PriceBandInput | null =
    entry !== undefined && stop !== undefined && entry !== stop
      ? {
          taken: state.taken,
          entryPrice: entry,
          stopPrice: stop,
          rMultiple: state.taken ? (live?.rMultiple ?? null) : null,
          mfeR: parseNumber(state.mfeR) ?? null,
          maeR: parseNumber(state.maeR) ?? null,
          postExitMfeR: state.taken
            ? (parseNumber(state.postExitMfeR) ?? null)
            : null,
        }
      : null;
  const showLive = typing && (live !== null || band !== null);

  const field = (
    key: keyof TradeFormState & string,
    label: string,
    options: { required?: boolean; numeric?: boolean; hint?: string } = {},
  ) => (
    <TextField
      id={key}
      label={label}
      type={key.endsWith("Time") ? "time" : "text"}
      numeric={options.numeric}
      required={options.required}
      hint={options.hint}
      value={state[key] as string}
      disabled={disabled}
      invalid={isMissing(label)}
      error={errors[key]}
      onChange={(value) => update({ [key]: value })}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <fieldset
        ref={fields}
        aria-label="Execution"
        className="flex min-w-0 flex-col gap-6"
        onFocus={() => setTyping(true)}
        onBlur={(event) => {
          if (!fields.current?.contains(event.relatedTarget as Node | null)) {
            setTyping(false);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {field("entryTime", "Entry time", {
            required: true,
            hint: "Chart clock",
          })}
          {state.taken && field("exitTime", "Exit time", { required: true })}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("entryPrice", "Entry price", {
            required: true,
            numeric: true,
          })}
          {field("stopPrice", "Stop price", { numeric: true })}
          {state.taken &&
            field("exitPrice", "Exit price", { required: true, numeric: true })}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {state.taken &&
            field("contracts", "Contracts", { required: true, numeric: true })}
          {field("mfeR", "MFE (R)", { numeric: true })}
          {field("maeR", "MAE (R)", { numeric: true })}
          {/* Post-exit MFE needs a stop: without one it cannot be derived.
              A value already typed keeps the field, so the schema's error
              for it has a place to land. */}
          {state.taken &&
            (stop !== undefined || state.postExitMfeR !== "") &&
            field("postExitMfeR", "Post-exit MFE (R)", { numeric: true })}
        </div>
      </fieldset>
      {state.taken &&
        field("pnlOverride", "P&L override (USD)", {
          numeric: true,
          hint: "Leave empty to use the derived P&L",
        })}
      {state.taken && state.accountIds.length > 0 && <Commissions {...props} />}
      {/* Last in the step, so it appearing and leaving with the focus never
          moves a field the trader is about to click. */}
      <AnimatePresence>
        {showLive && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-live="polite"
            className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
          >
            {live && (
              <div className="flex items-baseline gap-3 font-mono tabular-nums">
                <span className="font-sans text-muted-foreground text-xs">
                  Live
                </span>
                <span className={cn("text-lg", signTone(live.pnlCents))}>
                  {formatCents(live.pnlCents, {
                    signed: true,
                    currency: live.currency,
                  })}
                </span>
                {live.rMultiple !== null && (
                  <span className={cn("text-sm", signTone(live.rMultiple))}>
                    {live.rMultiple >= 0 ? "+" : ""}
                    {live.rMultiple.toFixed(2)}R
                  </span>
                )}
              </div>
            )}
            {band && (
              <PriceBandChart
                input={band}
                prices={{
                  stop: stop ?? null,
                  entry: entry ?? null,
                  exit: state.taken
                    ? (parseNumber(state.exitPrice) ?? null)
                    : null,
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Commissions({
  data,
  state,
  update,
  errors,
  editTrade,
  disabled,
}: StepProps) {
  /**
   * What an account's commission field shows while nothing is typed into it:
   * the same `commissionOnSave` the server runs, so the prefilled amount is
   * the one that gets stored. The edit page loads the trade in USD, so the
   * stored amounts compare as they are.
   */
  function shown(accountId: number): StoredCommission | null {
    const stored = editTrade?.accounts.find(
      (account) => account.id === accountId,
    );
    const existing: StoredCommission | null =
      stored?.commissionCents != null && stored.commissionSource != null
        ? { cents: stored.commissionCents, source: stored.commissionSource }
        : null;
    const contracts = parseNumber(state.contracts);
    if (contracts === undefined || contracts <= 0) return existing;

    const instrumentId = Number(state.instrumentId);
    const rate = data.commissionRates.find(
      (candidate) =>
        candidate.accountId === accountId &&
        candidate.instrumentId === instrumentId,
    );
    return commissionOnSave({
      typedCents: undefined,
      existing,
      perSideCents: rate?.perSideCents ?? null,
      contracts,
      basisChanged:
        editTrade !== null &&
        (instrumentId !== editTrade.instrumentId ||
          contracts !== editTrade.contracts),
      // Mirrors importMarksAfterEdit: a hand-changed P&L is no longer the
      // file's, so from then on the rate may fill in.
      pnlFromFile:
        editTrade?.pnlFromFile === true &&
        parseNumber(state.pnlOverride) === (editTrade.pnlOverride ?? undefined),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Commission (USD)</FieldLabel>
      <div className="grid gap-3 sm:grid-cols-2">
        {state.accountIds.map((accountId) => {
          const account = data.accounts.find(
            (candidate) => candidate.id === accountId,
          );
          const prefilled = shown(accountId);
          const typed = state.commissions[accountId];
          const isTyped = typed !== undefined && typed.trim() !== "";
          const inputId = `commission-${accountId}`;
          return (
            <div key={accountId} className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor={inputId}
                className="truncate text-muted-foreground text-xs"
              >
                {account?.name ?? "Account"}
              </label>
              <Input
                id={inputId}
                inputMode="decimal"
                placeholder="—"
                value={
                  typed ??
                  (prefilled === null ? "" : formatCentsPlain(prefilled.cents))
                }
                disabled={disabled}
                aria-invalid={errors.commissions ? true : undefined}
                onChange={(event) =>
                  update({
                    commissions: {
                      ...state.commissions,
                      [accountId]: event.target.value,
                    },
                  })
                }
                className="h-10 font-mono tabular-nums"
              />
              <span className="text-muted-foreground text-xs">
                {isTyped
                  ? COMMISSION_HINTS.manual
                  : prefilled === null
                    ? "No rate set for this account"
                    : COMMISSION_HINTS[prefilled.source]}
              </span>
            </div>
          );
        })}
      </div>
      <FieldError message={errors.commissions} />
    </div>
  );
}

export function StepWhy({
  data,
  state,
  update,
  errors,
  editTrade,
  disabled,
}: StepProps) {
  // A different strategy means the by-the-book answer was given against other
  // rules, so the server clears it: the form clears it too and says so.
  const savedStrategyId =
    editTrade?.strategy == null ? "" : String(editTrade.strategy.strategyId);
  const strategyChanged =
    editTrade !== null && state.strategyId !== savedStrategyId;

  // The newer rules the trade can explicitly adopt: the same, active strategy
  // has a revision other than the one the trade stores.
  const assigned = editTrade?.strategy;
  const option =
    assigned && state.strategyId === String(assigned.strategyId)
      ? data.strategies.find(
          (candidate) => candidate.id === assigned.strategyId,
        )
      : undefined;
  const adoptable =
    assigned &&
    option &&
    !option.archived &&
    option.currentRevisionId !== assigned.revisionId;

  // Adopting resets the by-the-book answer on the server; the form shows that
  // and restores the answer it held when the choice is taken back.
  const answerBeforeAdopting = useRef<boolean | undefined>(undefined);

  return (
    <div className="flex flex-col gap-6">
      <Choice
        label="Session"
        options={sessionEnum.options}
        value={state.session}
        disabled={disabled}
        onChange={(session) => update({ session })}
      />
      <Choice
        label="Setup type"
        options={setupTypeEnum.options}
        value={state.setupType}
        disabled={disabled}
        onChange={(setupType) => update({ setupType })}
      />
      <Choice
        label="Entry model"
        options={entryModelEnum.options}
        value={state.entryModel}
        disabled={disabled}
        onChange={(entryModel) => update({ entryModel })}
      />
      {data.strategies.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Choice
            label="Strategy"
            options={data.strategies.map((strategy) => String(strategy.id))}
            value={state.strategyId}
            disabled={disabled}
            onChange={(strategyId) =>
              update({
                strategyId,
                adoptCurrentStrategyRules: false,
                byTheBook:
                  strategyId === state.strategyId ? state.byTheBook : undefined,
              })
            }
            render={(id) => {
              const strategy = data.strategies.find(
                (candidate) => String(candidate.id) === id,
              );
              return (
                <>
                  {strategy?.name}
                  {strategy?.archived && (
                    <Badge variant="secondary">Archived</Badge>
                  )}
                </>
              );
            }}
          />
          {strategyChanged && (
            <p className="text-muted-foreground text-xs">
              A different strategy clears your by-the-book answer.
            </p>
          )}
          {adoptable && (
            <Toggle
              variant="outline"
              pressed={state.adoptCurrentStrategyRules}
              disabled={disabled}
              onPressedChange={(adopt) => {
                if (adopt) answerBeforeAdopting.current = state.byTheBook;
                update({
                  adoptCurrentStrategyRules: adopt,
                  byTheBook: adopt ? undefined : answerBeforeAdopting.current,
                });
              }}
              className="h-auto w-fit justify-start gap-2 whitespace-normal px-3 py-2 text-left aria-pressed:border-foreground/30"
            >
              <PopCheck shown={state.adoptCurrentStrategyRules} />
              <span className="flex flex-col">
                <span className="text-sm">
                  Adopt the current rules of this strategy
                </span>
                <span className="font-normal text-muted-foreground text-xs">
                  This trade keeps its older rules until you do. Adopting clears
                  your by-the-book answer.
                </span>
              </span>
            </Toggle>
          )}
          <FieldError message={errors.strategyId} />
        </div>
      )}
      <div className="flex flex-col gap-4">
        <FieldLabel>Confluences</FieldLabel>
        {data.confluenceGroups.map((group) => {
          const picked = group.tags.filter((tag) =>
            state.confluenceTagIds.includes(tag.id),
          ).length;
          return (
            <ChipGroup key={group.group} title={group.group} count={picked}>
              <Chips
                label={`Confluences · ${group.group}`}
                tone="process"
                items={group.tags}
                selected={state.confluenceTagIds}
                disabled={disabled}
                onChange={(confluenceTagIds) => update({ confluenceTagIds })}
              />
            </ChipGroup>
          );
        })}
      </div>
    </div>
  );
}

export function StepReflect({
  data,
  state,
  update,
  errors,
  disabled,
}: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <Choice
        label="Grade your execution"
        round
        options={gradeEnum.options}
        value={state.grade}
        disabled={disabled}
        onChange={(grade) => update({ grade })}
      />
      <Choice
        label="Felt"
        options={feltEnum.options}
        value={state.felt}
        disabled={disabled}
        onChange={(felt) => update({ felt })}
      />
      {state.taken && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Choice
            label="Result"
            options={resultEnum.options}
            value={state.result}
            disabled={disabled}
            onChange={(result) => update({ result })}
          />
          <div className="flex flex-col gap-1.5">
            <Choice
              label="By the book"
              options={["Yes", "No"] as const}
              value={
                state.byTheBook === undefined
                  ? ""
                  : state.byTheBook
                    ? "Yes"
                    : "No"
              }
              disabled={disabled || state.adoptCurrentStrategyRules}
              onChange={(value) =>
                update({
                  byTheBook: value === "" ? undefined : value === "Yes",
                })
              }
            />
            <p className="text-muted-foreground text-xs">
              Against the strategy's rules, or your own when none is set.
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Mistakes</FieldLabel>
        <Chips
          label="Mistakes"
          items={data.mistakeTags}
          selected={state.mistakeTagIds}
          disabled={disabled}
          onChange={(mistakeTagIds) => update({ mistakeTagIds })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor="notes">Notes</FieldLabel>
        <Textarea
          id="notes"
          rows={4}
          value={state.notes}
          placeholder="One sentence is enough."
          disabled={disabled}
          aria-invalid={errors.notes ? true : undefined}
          onChange={(event) => update({ notes: event.target.value })}
          className="min-h-24"
        />
        <FieldError message={errors.notes} />
      </div>
    </div>
  );
}
