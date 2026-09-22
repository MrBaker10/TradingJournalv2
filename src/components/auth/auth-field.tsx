"use client";

import { type InputHTMLAttributes, useId } from "react";
import {
  InlineMessage,
  type InlineMessageTone,
} from "@/components/ui/inline-message";

interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  message?: string | null;
  /** A hint is not an error: neutral colour, no red edge. */
  tone?: InlineMessageTone;
  /** Codes and keys read better in mono with tabular figures. */
  mono?: boolean;
}

// Design.md §4.5: label above the field, never floating; the message line
// exists from the start so nothing moves when an error appears.
export function AuthField({
  label,
  message = null,
  tone = "error",
  mono = false,
  id,
  ...inputProps
}: AuthFieldProps) {
  // useId, not `name`: two cards on one page may both have a "password"
  // field, and a shared id would point one label at the other card's input.
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="cap">
        {label}
      </label>
      <input
        id={inputId}
        {...inputProps}
        aria-invalid={message && tone === "error" ? true : undefined}
        className={`h-10 rounded-ctl border bg-well px-3 text-sm text-fg transition-colors duration-200 placeholder:text-fg-placeholder hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60 ${
          message && tone === "error"
            ? "border-danger-fg/60"
            : "border-white/12"
        } ${mono ? "font-mono tabular-nums tracking-wider" : ""}`}
      />
      <InlineMessage message={message} tone={tone} />
    </div>
  );
}
