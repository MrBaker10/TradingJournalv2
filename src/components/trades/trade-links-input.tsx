"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { InlineMessage } from "@/components/ui/inline-message";
import { domainLabel } from "@/lib/links";
import { httpsUrlSchema } from "@/schemas/trades";

export interface TradeLinkItem {
  id: string | number;
  url: string;
  label: string | null;
}

interface TradeLinksInputProps {
  links: TradeLinkItem[];
  disabled?: boolean;
  onAdd: (input: { url: string; label?: string }) => void | Promise<void>;
  onRemove: (id: string | number) => void | Promise<void>;
}

// Arbitrarily many links, https-only (same httpsUrlSchema the server
// re-validates with — one validation truth, coding-standards.md). Callers own
// what "add" and "remove" actually do, same split as ScreenshotSlots.
export function TradeLinksInput({
  links,
  disabled,
  onAdd,
  onRemove,
}: TradeLinksInputProps) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const trimmedUrl = url.trim();
    if (trimmedUrl === "") return;

    const parsed = httpsUrlSchema.safeParse(trimmedUrl);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setError(null);
    startTransition(async () => {
      await onAdd({ url: trimmedUrl, label: label.trim() || undefined });
      setUrl("");
      setLabel("");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {links.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between gap-2 rounded-xs border border-white/12 bg-well px-2.5 py-1.5 text-sm"
            >
              <span className="truncate text-fg-muted">
                {link.label || domainLabel(link.url)}
              </span>
              <button
                type="button"
                disabled={disabled || isPending}
                onClick={() => startTransition(() => onRemove(link.id))}
                aria-label="Remove link"
                className="shrink-0 text-fg-subtle transition-colors hover:text-danger-fg disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5 sm:flex-row">
        <input
          type="text"
          placeholder="https://…"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            if (error) setError(null);
          }}
          disabled={disabled || isPending}
          className="h-10 flex-1 rounded-ctl border border-white/12 bg-well px-3 text-sm text-fg placeholder:text-fg-placeholder focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none"
        />
        <input
          type="text"
          placeholder="Label (optional)"
          value={label}
          // Matches the label cap in tradeLinkSchema/addTradeLinkSchema
          // (src/schemas/trades.ts) — stops a value the server would reject
          // anyway from ever being typed.
          maxLength={200}
          onChange={(event) => setLabel(event.target.value)}
          disabled={disabled || isPending}
          className="h-10 rounded-ctl border border-white/12 bg-well px-3 text-sm text-fg placeholder:text-fg-placeholder focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none sm:w-40"
        />
        <button
          type="button"
          disabled={disabled || isPending || url.trim() === ""}
          onClick={handleAdd}
          className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xs border border-white/12 px-3 text-sm text-fg-muted transition-colors hover:border-cyan/35 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          Add
        </button>
      </div>
      <InlineMessage message={error} />
    </div>
  );
}
