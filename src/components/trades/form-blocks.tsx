"use client";

import { Check, ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

// The form blocks of Design.md §3.5. The trade form walks them in steps; the
// ledger entry, weekly review and import reuse them on one page.

/** The shared highlight's spring (Design.md §3.5, Motion). */
export const PICK_SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 34,
} as const;

export function FieldLabel({
  children,
  required = false,
  htmlFor,
  id,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
  id?: string;
}) {
  return (
    <label
      id={id}
      htmlFor={htmlFor}
      className="font-medium text-muted-foreground text-xs"
    >
      {children}
      {required && (
        <span className="ml-0.5 text-process" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

/** A field's own error line, in `negative`; empty renders nothing. */
export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-negative text-xs">
      {message}
    </p>
  );
}

/**
 * The check that pops in on a chosen option. Its slot is always there, so a
 * check appearing never shifts the label; only scale and opacity move.
 * Reduced motion: there at once. The element is the same either way, so
 * server and client markup agree.
 */
export function PopCheck({
  shown,
  tone = "process",
  className,
}: {
  shown: boolean;
  tone?: "process" | "neutral";
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={false}
      animate={shown ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={reduce ? { duration: 0 } : PICK_SPRING}
      className={cn("flex shrink-0", className)}
    >
      <Check
        className={cn(
          "size-3.5",
          tone === "process" ? "text-process" : "text-foreground",
        )}
        strokeWidth={3}
        aria-hidden="true"
      />
    </motion.span>
  );
}

/**
 * One of a few, as loose buttons. A shared highlight springs to the pick and
 * the press gives; a second click on the chosen option clears it, unless the
 * answer is required (`clearable={false}`).
 */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  clearable = true,
  round = false,
  invalid = false,
  disabled = false,
  isOptionDisabled,
  render,
}: {
  label: string;
  options: readonly T[];
  value: string;
  onChange: (value: T | "") => void;
  clearable?: boolean;
  round?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  /** One option shown but not pickable, while the others are. */
  isOptionDisabled?: (option: T) => boolean;
  render?: (option: T) => ReactNode;
}) {
  const id = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 font-medium text-muted-foreground text-xs">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = value === option;
          return (
            <Toggle
              key={option}
              variant="outline"
              pressed={active}
              disabled={disabled || isOptionDisabled?.(option)}
              // So a form's check can focus the first choice of a missing
              // answer, as it focuses an invalid field.
              aria-invalid={(invalid && !value) || undefined}
              onPressedChange={() => {
                if (!active) onChange(option);
                else if (clearable) onChange("");
              }}
              render={
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={PICK_SPRING}
                />
              }
              className={cn(
                "relative text-muted-foreground transition-[color,border-color,background-color] duration-150 hover:bg-accent hover:text-foreground aria-pressed:bg-transparent aria-pressed:text-foreground",
                round
                  ? "size-11 rounded-full font-medium text-[15px]"
                  : "h-10 px-3 text-[13px] lg:h-9",
                active
                  ? "border-foreground/30"
                  : invalid && "border-negative/60",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`${id}-pick`}
                  transition={PICK_SPRING}
                  className={cn(
                    "absolute inset-0 bg-muted",
                    round ? "rounded-full" : "rounded-lg",
                  )}
                />
              )}
              {round ? (
                <>
                  <span className="relative">
                    {render ? render(option) : option}
                  </span>
                  <span className="absolute -top-0.5 -right-0.5 flex">
                    <PopCheck
                      shown={active}
                      className="rounded-full bg-background p-0.5"
                    />
                  </span>
                </>
              ) : (
                <span className="relative flex items-center gap-1.5">
                  <PopCheck shown={active} />
                  {render ? render(option) : option}
                </span>
              )}
            </Toggle>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface CardOption<T extends string> {
  value: T;
  title: string;
  hint: string;
  icon?: ReactNode;
}

/**
 * Two big answers to one required question: taken or missed, long or short.
 * A card is never cleared by a second click; the other card changes it.
 */
export function CardChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  invalid = false,
  disabled = false,
}: {
  label: string;
  options: readonly CardOption<T>[];
  value: string;
  onChange: (value: T) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <fieldset
      aria-label={label}
      className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Toggle
            key={option.value}
            variant="outline"
            pressed={active}
            disabled={disabled}
            onPressedChange={() => onChange(option.value)}
            render={
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={PICK_SPRING}
              />
            }
            className={cn(
              "relative h-auto justify-start gap-3 whitespace-normal rounded-xl p-4 text-left transition-[translate,border-color,background-color] duration-150 hover:-translate-y-px hover:bg-accent aria-pressed:bg-transparent",
              active ? "border-foreground/30" : invalid && "border-negative/60",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-card`}
                transition={PICK_SPRING}
                className="absolute inset-0 rounded-xl bg-muted"
              />
            )}
            {option.icon && (
              <span
                className={cn(
                  "relative flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                  active
                    ? "bg-background text-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {option.icon}
              </span>
            )}
            <span className="relative flex min-w-0 flex-col">
              <span
                className={cn(
                  "font-medium text-[15px]",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {option.title}
              </span>
              <span className="font-normal text-muted-foreground text-xs">
                {option.hint}
              </span>
            </span>
            <span className="relative ml-auto flex size-5 shrink-0 items-center justify-center">
              <PopCheck shown={active} />
            </span>
          </Toggle>
        );
      })}
    </fieldset>
  );
}

// A toggled chip bounces once, on and off alike (Design.md §3.5).
const CHIP_BOUNCE = {
  on: { scale: [1, 1.06, 1], transition: { duration: 0.22 } },
  off: { scale: [1, 1.06, 1], transition: { duration: 0.22 } },
};

export interface ChipItem {
  id: number;
  label: string;
  practice?: boolean;
  archived?: boolean;
}

/**
 * Many-of: each chip bounces once when toggled and shows a check.
 * Confluences select in `process`; accounts and mistakes stay neutral, so a
 * mistake never lights up like something earned.
 */
export function Chips({
  label,
  items,
  selected,
  onChange,
  tone = "neutral",
  invalid = false,
  disabled = false,
}: {
  label: string;
  items: readonly ChipItem[];
  selected: readonly number[];
  onChange: (ids: number[]) => void;
  tone?: "process" | "neutral";
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <fieldset aria-label={label} className="flex min-w-0 flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <Toggle
            key={item.id}
            variant="outline"
            pressed={active}
            disabled={disabled}
            onPressedChange={() =>
              onChange(
                active
                  ? selected.filter((id) => id !== item.id)
                  : [...selected, item.id],
              )
            }
            render={
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                initial={false}
                variants={CHIP_BOUNCE}
                animate={active ? "on" : "off"}
              />
            }
            className={cn(
              "h-10 rounded-full px-3 text-muted-foreground text-xs transition-[color,border-color,background-color] duration-150 hover:bg-accent hover:text-foreground aria-pressed:text-foreground lg:h-9",
              active
                ? tone === "process"
                  ? "border-process/60 bg-process/15 aria-pressed:bg-process/15"
                  : "border-foreground/30 aria-pressed:bg-muted"
                : invalid && "border-negative/60",
              // The practice account is named as well as striped (§5).
              item.practice && "border-l-2 border-l-practice",
            )}
          >
            <PopCheck shown={active} tone={tone} />
            {item.label}
            {item.practice && <Badge variant="outline">Practice</Badge>}
            {item.archived && <Badge variant="secondary">Archived</Badge>}
          </Toggle>
        );
      })}
    </fieldset>
  );
}

/** A collapsible chip group, open by default (confluence groups). */
export function ChipGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <details open className="group/chips flex flex-col gap-2">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm font-medium text-muted-foreground text-xs outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="size-3.5 transition-[rotate] duration-150 group-not-open/chips:-rotate-90"
          aria-hidden="true"
        />
        {title}
        {count > 0 && (
          <span className="font-mono text-process tabular-nums">{count}</span>
        )}
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

/**
 * The saved state's check: a circle, then the tick, drawn in `process`
 * (450 ms, then 300 ms). Reduced motion shows it drawn at once.
 */
export function DrawnCheck() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 52 52" className="size-14" aria-hidden="true">
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        className="fill-none stroke-2 stroke-process"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={
          reduce ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }
        }
      />
      <motion.path
        d="M15 27 l7 7 l15 -15"
        className="fill-none stroke-3 stroke-process"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.3, delay: 0.4, ease: "easeOut" }
        }
      />
    </svg>
  );
}

/** A labelled text, number, date or time field with its error line. */
export function TextField({
  id,
  label,
  value,
  onChange,
  required = false,
  invalid = false,
  error,
  type = "text",
  numeric = false,
  placeholder,
  hint,
  maxLength,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
  error?: string;
  type?: "text" | "date" | "time";
  numeric?: boolean;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  const bad = invalid || Boolean(error);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        step={type === "time" ? 1 : undefined}
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        aria-invalid={bad || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn("h-10", numeric && "font-mono tabular-nums")}
      />
      {hint && !error && (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
