import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// In page order; each label is `settings.sections.<id>` in the dictionary.
export const SETTINGS_SECTIONS = [
  { id: "accounts" },
  { id: "checklist" },
  { id: "data" },
  { id: "language" },
  { id: "security" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

/** One section of the settings page (Design.md §3.8), a target for the TOC. */
export function SettingsSection({
  id,
  hint,
  className,
  children,
}: {
  id: SettingsSectionId;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("settings.sections");
  const label = t(id);
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn("flex scroll-mt-6 flex-col gap-4 border-t pt-8", className)}
    >
      <div className="flex flex-col gap-0.5">
        <h2
          id={`${id}-heading`}
          className="font-semibold text-lg tracking-tight"
        >
          {label}
        </h2>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
