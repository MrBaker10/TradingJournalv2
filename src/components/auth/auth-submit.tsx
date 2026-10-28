"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { cn } from "@/lib/utils";

interface AuthSubmitProps {
  children: ReactNode;
  pending: boolean;
  pendingLabel: string;
}

// The card's one primary button (Design.md §3.13). Success is a navigation,
// so there is no "Saved" hold; pending disables it and says so (§3.11).
export function AuthSubmit({
  children,
  pending,
  pendingLabel,
}: AuthSubmitProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      // Pending is a state of the button, not "unavailable".
      className={cn("h-10 w-full", pending && "disabled:opacity-100")}
    >
      {pending ? <PendingIndicator label={pendingLabel} /> : children}
    </Button>
  );
}
