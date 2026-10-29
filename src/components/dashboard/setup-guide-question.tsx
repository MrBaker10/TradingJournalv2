"use client";

import { useState, useTransition } from "react";
import { answerSetupGuide } from "@/actions/setup-guide";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { runWithToast } from "@/components/ui/toast";
import {
  SETUP_GUIDE_SAVE_FAILED,
  type SetupGuideAnswer,
} from "@/schemas/setup-guide";

const ANSWERS = [
  { choice: "accept", label: "Yes, show me", variant: "outline" },
  { choice: "decline", label: "No, I'll find my way", variant: "ghost" },
] as const satisfies readonly {
  choice: SetupGuideAnswer;
  label: string;
  variant: "outline" | "ghost";
}[];

// The two answers. Both re-render the dashboard from the server, which then
// shows the steps or nothing; there is no confirmation toast.
export function SetupGuideQuestion() {
  const [pending, setPending] = useState<SetupGuideAnswer | null>(null);
  const [, startTransition] = useTransition();

  function answer(choice: SetupGuideAnswer) {
    setPending(choice);
    startTransition(async () => {
      await runWithToast(() => answerSetupGuide({ answer: choice }), {
        failed: SETUP_GUIDE_SAVE_FAILED,
      });
      setPending(null);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ANSWERS.map(({ choice, label, variant }) => (
        <Button
          key={choice}
          type="button"
          size="lg"
          variant={variant}
          className="h-10 min-w-32 px-4"
          disabled={pending !== null}
          onClick={() => answer(choice)}
        >
          {pending === choice ? <PendingIndicator label="Saving…" /> : label}
        </Button>
      ))}
    </div>
  );
}
