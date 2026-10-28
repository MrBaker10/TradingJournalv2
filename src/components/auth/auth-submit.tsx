"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { cn } from "@/lib/utils";

interface AuthSubmitProps {
  children: ReactNode;
  pending: boolean;
  pendingLabel: string;
  /** Shown with a check while a save is confirmed; omit where success is a navigation. */
  success?: string | null;
  /** The auth card's one button spans the card; a settings row's does not. */
  fullWidth?: boolean;
}

// The submit button of the sign-in card and the security rows (Design.md
// §3.11): pending disables it and says so, a confirmed save holds a check.
export function AuthSubmit({
  children,
  pending,
  pendingLabel,
  success = null,
  fullWidth = true,
}: AuthSubmitProps) {
  const busy = pending || success !== null;
  return (
    <Button
      type="submit"
      size="lg"
      disabled={busy}
      // Pending and saved are states of the button, not "unavailable".
      className={cn(
        "h-10",
        fullWidth ? "w-full" : "min-w-36",
        busy && "disabled:opacity-100",
      )}
    >
      {pending ? (
        <PendingIndicator label={pendingLabel} />
      ) : success !== null ? (
        <>
          <Check aria-hidden="true" />
          {success}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
