"use client";

import { type ComponentProps, useId } from "react";
import { FieldError, FieldLabel } from "@/components/trades/form-blocks";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AuthTextFieldProps
  extends Omit<ComponentProps<"input">, "className" | "id"> {
  label: string;
  error?: string | null;
  /** Shown under the field while there is no error. */
  hint?: string;
  /** Codes and keys read better in mono with tabular figures. */
  mono?: boolean;
}

// A labelled shadcn input with its error at the field (Design.md §3.11), as
// the form blocks' TextField, plus what sign-in needs: name, autocomplete,
// password type and input mode.
export function AuthTextField({
  label,
  error = null,
  hint,
  mono = false,
  ...inputProps
}: AuthTextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        {...inputProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn("h-10", mono && "font-mono tabular-nums tracking-wider")}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error ?? undefined} />
    </div>
  );
}
