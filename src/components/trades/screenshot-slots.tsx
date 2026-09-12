"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { InlineMessage } from "@/components/ui/inline-message";
import { MAX_SCREENSHOTS_PER_TRADE } from "@/domain/trades";

const CONFIRM_TIMEOUT_MS = 3000;

export interface ScreenshotItem {
  id: string | number;
  url: string;
}

interface ScreenshotSlotsProps {
  screenshots: ScreenshotItem[];
  disabled?: boolean;
  error?: string | null;
  onAdd: (file: File) => void | Promise<void>;
  onRemove: (id: string | number) => void | Promise<void>;
}

// Up to three tiles plus an add slot (src/domain/trades.ts,
// canAddScreenshot, enforces the same limit server-side). Callers own what
// "add" and "remove" actually do — stage a local Blob in the New Trade form,
// or call the server immediately when attaching to an existing trade — this
// component only picks a file and confirms removal.
export function ScreenshotSlots({
  screenshots,
  disabled,
  error,
  onAdd,
  onRemove,
}: ScreenshotSlotsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | number | null>(
    null,
  );
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canAddMore = screenshots.length < MAX_SCREENSHOTS_PER_TRADE;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    startTransition(async () => {
      await onAdd(file);
    });
  }

  function handleRemoveClick(id: string | number) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
      confirmTimeout.current = setTimeout(
        () => setConfirmingId(null),
        CONFIRM_TIMEOUT_MS,
      );
      return;
    }

    if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
    setConfirmingId(null);
    startTransition(async () => {
      await onRemove(id);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        {screenshots.map((screenshot) => (
          <div
            key={screenshot.id}
            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xs border border-white/12"
          >
            {/* biome-ignore lint/performance/noImgElement: signed local-storage URLs, not something next/image can optimize */}
            <img
              src={screenshot.url}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              disabled={disabled || isPending}
              onClick={() => handleRemoveClick(screenshot.id)}
              aria-label={
                confirmingId === screenshot.id
                  ? "Confirm remove screenshot"
                  : "Remove screenshot"
              }
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                confirmingId === screenshot.id
                  ? "bg-danger/70 opacity-100"
                  : "bg-black/60 opacity-0 group-hover:opacity-100"
              }`}
            >
              <X className="h-4 w-4 text-white" aria-hidden="true" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            disabled={disabled || isPending}
            onClick={() => inputRef.current?.click()}
            aria-label="Add screenshot"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xs border border-white/12 border-dashed text-fg-subtle transition-colors hover:border-cyan/35 hover:text-fg-muted disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <InlineMessage message={error ?? null} />
    </div>
  );
}
