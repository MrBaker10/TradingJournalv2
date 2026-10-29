"use client";

import { FieldError, FieldLabel } from "@/components/trades/form-blocks";
import { Input } from "@/components/ui/input";
import type { AccountRulesRow } from "@/db/queries/account-rules";
import type { ProgramOption } from "@/db/queries/prop-firms";
import { DRAWDOWN_TYPES, type DrawdownType } from "@/domain/account-rules";
import { formatCentsPlain } from "@/lib/money";
import { parseDecimalInput } from "@/lib/numbers";
import { HELP_TEXT, PART_HEADING, SELECT_CLASS } from "./fields";

/** The link as the editor holds it; `programId` "" means not linked. */
export interface ProgramLinkDraft {
  programId: string;
  evaluationStart: string;
  profitTarget: string;
  drawdownAmount: string;
  drawdownType: DrawdownType;
  lockLevel: string;
  dailyLossLimit: string;
  consistencyPercent: string;
  minTradingDays: string;
}

const DRAWDOWN_LABELS: Record<DrawdownType, string> = {
  static: "Static",
  eod_trailing: "EOD trailing",
  intraday_trailing: "Intraday trailing",
};

const DRAWDOWN_HELP: Record<DrawdownType, string> = {
  static: "The floor stays at starting balance minus the drawdown.",
  eod_trailing: "The floor follows your highest end-of-day balance.",
  intraday_trailing:
    "Shown as not checkable — the journal has no intraday balance.",
};

const cents = (value: number | null) =>
  value === null ? "" : formatCentsPlain(value);
const count = (value: number | null) => (value === null ? "" : String(value));

export function initialLinkDraft(
  rules: AccountRulesRow | null | undefined,
  today: string,
): ProgramLinkDraft {
  return {
    programId: rules ? String(rules.programId) : "",
    evaluationStart: rules?.evaluationStart ?? today,
    profitTarget: cents(rules?.profitTargetCents ?? null),
    drawdownAmount: cents(rules?.drawdownAmountCents ?? null),
    drawdownType: rules?.drawdownType ?? "static",
    lockLevel: cents(rules?.lockLevelCents ?? null),
    dailyLossLimit: cents(rules?.dailyLossLimitCents ?? null),
    consistencyPercent: count(rules?.consistencyPercent ?? null),
    minTradingDays: count(rules?.minTradingDays ?? null),
  };
}

/** An empty optional field is `null`: the program has no such rule. */
function optional(value: string): number | null {
  return parseDecimalInput(value) ?? null;
}

/**
 * The link as the schema reads it, or null when not linked. A lock level that
 * is hidden because the type is not EOD trailing is not sent.
 */
export function linkInput(link: ProgramLinkDraft) {
  if (link.programId === "") return null;
  return {
    programId: Number(link.programId),
    evaluationStart: link.evaluationStart,
    profitTarget: parseDecimalInput(link.profitTarget),
    drawdownAmount: parseDecimalInput(link.drawdownAmount),
    drawdownType: link.drawdownType,
    lockLevel:
      link.drawdownType === "eod_trailing" ? optional(link.lockLevel) : null,
    dailyLossLimit: optional(link.dailyLossLimit),
    consistencyPercent: optional(link.consistencyPercent),
    minTradingDays: optional(link.minTradingDays),
  };
}

function RuleField({
  id,
  label,
  value,
  onChange,
  error,
  help,
  reference,
  type = "amount",
}: {
  id: keyof ProgramLinkDraft;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  reference?: string | null;
  type?: "amount" | "count" | "date";
}) {
  const inputId = `account-rules-${id}`;
  const described = [
    `${inputId}-error`,
    help && `${inputId}-help`,
    reference && `${inputId}-reference`,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        type={type === "date" ? "date" : "text"}
        inputMode={
          type === "amount"
            ? "decimal"
            : type === "count"
              ? "numeric"
              : undefined
        }
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={type === "amount" ? "0.00" : undefined}
        className={`h-10 ${type === "date" ? "" : "font-mono tabular-nums"}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
      />
      <FieldError id={`${inputId}-error`} message={error} />
      {help && (
        <p id={`${inputId}-help`} className={HELP_TEXT}>
          {help}
        </p>
      )}
      {reference && (
        <p id={`${inputId}-reference`} className={HELP_TEXT}>
          Program: {reference}
        </p>
      )}
    </div>
  );
}

export function AccountProgramLink({
  link,
  programs,
  isPractice,
  onChange,
  errors,
}: {
  link: ProgramLinkDraft;
  programs: ProgramOption[];
  isPractice: boolean;
  onChange: (link: ProgramLinkDraft) => void;
  errors: Record<string, string>;
}) {
  const program = programs.find(
    (option) => String(option.id) === link.programId,
  );
  const firms = [...new Set(programs.map((option) => option.firmName))];
  const set = (key: keyof ProgramLinkDraft) => (value: string) =>
    onChange({ ...link, [key]: value });
  const error = (key: string) => errors[`rules.${key}`];

  return (
    <section
      aria-labelledby="account-rules-heading"
      className="flex flex-col gap-4 border-t pt-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id="account-rules-heading" className={PART_HEADING}>
          Prop firm program
        </h3>
        <p className={HELP_TEXT}>
          Link the program you bought and enter its rules as your firm states
          them for this account.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="account-rules-program">Program</FieldLabel>
        <select
          id="account-rules-program"
          value={link.programId}
          onChange={(event) => set("programId")(event.target.value)}
          disabled={isPractice}
          className={SELECT_CLASS}
          aria-invalid={error("programId") ? true : undefined}
          aria-describedby="account-rules-program-error account-rules-program-help"
        >
          <option value="">Not linked</option>
          {firms.map((firm) => (
            <optgroup key={firm} label={firm}>
              {programs
                .filter((option) => option.firmName === firm)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.discontinued
                      ? `${option.name} — no longer sold`
                      : option.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <FieldError
          id="account-rules-program-error"
          message={error("programId")}
        />
        <p id="account-rules-program-help" className={HELP_TEXT}>
          {isPractice
            ? "Practice accounts can't be linked."
            : program?.reference.accountSize
              ? `Program: account size ${program.reference.accountSize}. The account's starting balance is the attempt's starting balance.`
              : "The account's starting balance is the attempt's starting balance."}
          {!isPractice &&
            program?.discontinued &&
            " No longer sold: the program text is as last updated."}
        </p>
      </div>
      {program && !isPractice && (
        <div className="grid gap-4 sm:grid-cols-2">
          <RuleField
            id="evaluationStart"
            label="Evaluation start"
            type="date"
            value={link.evaluationStart}
            onChange={set("evaluationStart")}
            error={error("evaluationStart")}
            help="Trades before this day don't count."
          />
          <RuleField
            id="profitTarget"
            label="Profit target (USD)"
            value={link.profitTarget}
            onChange={set("profitTarget")}
            error={error("profitTarget")}
            reference={program.reference.profitTarget}
          />
          <RuleField
            id="drawdownAmount"
            label="Max drawdown (USD)"
            value={link.drawdownAmount}
            onChange={set("drawdownAmount")}
            error={error("drawdownAmount")}
            reference={program.reference.maxDrawdown}
          />
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="account-rules-drawdownType">
              Drawdown type
            </FieldLabel>
            <select
              id="account-rules-drawdownType"
              value={link.drawdownType}
              onChange={(event) =>
                onChange({
                  ...link,
                  drawdownType: event.target.value as DrawdownType,
                })
              }
              className={SELECT_CLASS}
              aria-describedby="account-rules-drawdownType-help"
            >
              {DRAWDOWN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DRAWDOWN_LABELS[type]}
                </option>
              ))}
            </select>
            <p id="account-rules-drawdownType-help" className={HELP_TEXT}>
              {DRAWDOWN_HELP[link.drawdownType]}
            </p>
          </div>
          {link.drawdownType === "eod_trailing" && (
            <RuleField
              id="lockLevel"
              label="Lock level (USD)"
              value={link.lockLevel}
              onChange={set("lockLevel")}
              error={error("lockLevel")}
              help="Optional. The floor stops trailing at this balance."
            />
          )}
          <RuleField
            id="dailyLossLimit"
            label="Daily loss limit (USD)"
            value={link.dailyLossLimit}
            onChange={set("dailyLossLimit")}
            error={error("dailyLossLimit")}
            help="Optional."
            reference={program.reference.dailyLossLimit}
          />
          <RuleField
            id="consistencyPercent"
            label="Consistency (%)"
            type="count"
            value={link.consistencyPercent}
            onChange={set("consistencyPercent")}
            error={error("consistencyPercent")}
            help="Optional. The largest share of total profit one day may hold."
            reference={program.reference.consistencyRule}
          />
          <RuleField
            id="minTradingDays"
            label="Minimum trading days"
            type="count"
            value={link.minTradingDays}
            onChange={set("minTradingDays")}
            error={error("minTradingDays")}
            help="Optional."
            reference={program.reference.minTradingDays}
          />
        </div>
      )}
    </section>
  );
}
