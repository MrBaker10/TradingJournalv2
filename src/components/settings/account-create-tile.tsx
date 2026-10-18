"use client";

import { Plus } from "lucide-react";

export function AccountCreateTile({
  onOpenChange,
  disabled,
}: {
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpenChange(true)}
      className="flex h-11 shrink-0 items-center gap-2 rounded-ctl bg-[image:var(--gradient-info-soft)] px-4 text-sm font-medium text-fg shadow-[var(--shadow-info-soft)] transition-colors hover:bg-white/5 focus-visible:outline-cyan disabled:opacity-40"
    >
      <Plus className="h-4 w-4 text-cyan" aria-hidden="true" />
      Add account
    </button>
  );
}
