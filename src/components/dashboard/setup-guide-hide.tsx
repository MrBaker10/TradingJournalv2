"use client";

import { EyeOff } from "lucide-react";
import { useTransition } from "react";
import { hideSetupGuide } from "@/actions/setup-guide";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { runWithToast } from "@/components/ui/toast";
import { SETUP_GUIDE_SAVE_FAILED } from "@/schemas/setup-guide";

// Offered only once an account exists; the dashboard re-renders without the
// card, and Settings then offers the switch to bring it back.
export function SetupGuideHide() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      className="-my-1 ml-auto h-10 min-w-32 px-3 lg:h-9"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await runWithToast(hideSetupGuide, {
            failed: SETUP_GUIDE_SAVE_FAILED,
          });
        })
      }
    >
      {pending ? (
        <PendingIndicator label="Saving…" />
      ) : (
        <>
          <EyeOff aria-hidden="true" />
          Hide guide
        </>
      )}
    </Button>
  );
}
