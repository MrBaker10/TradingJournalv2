import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROW_ACTION, SettingsRow } from "./settings-row";

// A server component: nothing here is interactive. The download is a plain
// anchor to the route handler, so no client bundle and no JavaScript are
// needed to get the file.
export function ExportCard() {
  return (
    <SettingsRow
      title="Export journal"
      hint="Every trade and missed setup as CSV, including practice accounts — not the current view."
      action={
        <a
          href="/api/export/trades"
          download
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            ROW_ACTION,
          )}
        >
          <Download aria-hidden="true" />
          Download CSV
        </a>
      }
    />
  );
}
