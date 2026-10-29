"use client";

import { ListChecks } from "lucide-react";
import { useTransition } from "react";
import { showSetupGuide } from "@/actions/setup-guide";
import { Switch } from "@/components/ui/switch";
import { runWithToast } from "@/components/ui/toast";
import { SETUP_GUIDE_SAVE_FAILED } from "@/schemas/setup-guide";
import { SettingsRow } from "./settings-row";

// Rendered only while the rules offer it: the guide was declined or hidden
// and a required step is still open. Turning it on brings the step list back
// to the dashboard, and this row goes away with the re-render.
export function SetupGuideSwitch() {
  const [pending, startTransition] = useTransition();
  return (
    // Set apart from the account rows so it is not missed; neutral surface,
    // no process colour (Design.md §3.8).
    <SettingsRow
      className="mt-2 rounded-lg border bg-muted/40 px-4"
      title={
        <span
          id="setup-guide-switch-label"
          className="flex items-center gap-2 font-medium"
        >
          <ListChecks aria-hidden="true" className="size-4" />
          Show setup guide
        </span>
      }
      hint="Five steps on the dashboard, each linking to where it is done."
      action={
        // Off at rest by definition: the row only exists while the guide is
        // off. It shows on while the save runs, then leaves with the
        // re-render. The taller hit area keeps the 40 px touch target
        // (Design.md §5).
        <Switch
          checked={pending}
          disabled={pending}
          aria-labelledby="setup-guide-switch-label"
          className="after:-inset-y-3"
          onCheckedChange={(checked) => {
            if (!checked) return;
            startTransition(async () => {
              await runWithToast(showSetupGuide, {
                failed: SETUP_GUIDE_SAVE_FAILED,
              });
            });
          }}
        />
      }
    />
  );
}
