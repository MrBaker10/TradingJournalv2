"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { PendingIndicator } from "@/components/ui/pending-indicator";

interface SubmitButtonProps {
  children: ReactNode;
  loading: boolean;
  /** Shown for the §4.2 success hold. Omit where success is a navigation. */
  success?: ReactNode | null;
  pendingLabel?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

// The primary button from Design.md §4.2 — same states and timings as the
// one in account-create-form.tsx. Label, spinner and success sit on top of
// each other, so the button keeps its width in every state.
export function SubmitButton({
  children,
  loading,
  success = null,
  pendingLabel = "Working…",
  fullWidth = false,
  disabled = false,
}: SubmitButtonProps) {
  const busy = loading || success !== null || disabled;
  return (
    <motion.button
      type="submit"
      disabled={busy}
      whileHover={
        busy
          ? undefined
          : {
              y: -1,
              filter: "brightness(1.1)",
              boxShadow: "var(--shadow-button-primary-hover)",
              transition: { duration: 0.15, ease: "easeOut" },
            }
      }
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileTap={
        busy
          ? undefined
          : { scale: 0.978, transition: { duration: 0.1, ease: "easeIn" } }
      }
      className={`relative h-10 shrink-0 rounded-ctl px-4 text-sm font-medium text-fg shadow-[var(--shadow-button-primary)] disabled:cursor-default ${
        fullWidth ? "w-full" : ""
      } ${
        success !== null
          ? "bg-[image:var(--gradient-success)]"
          : "bg-[image:var(--gradient-info)]"
      }`}
    >
      <span
        className={`inline-flex items-center justify-center transition-opacity duration-200 ease-linear ${
          loading || success !== null ? "opacity-0" : "opacity-100"
        }`}
      >
        {children}
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-linear ${
          loading ? "opacity-100" : "opacity-0"
        }`}
      >
        <PendingIndicator label={pendingLabel} />
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-200 ease-linear ${
          success !== null ? "opacity-100" : "opacity-0"
        }`}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        {success}
      </span>
    </motion.button>
  );
}
