"use client";

import { ImagePlus, Link2, Loader2, Plus, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { FieldError, FieldLabel } from "@/components/trades/form-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { MAX_SCREENSHOTS_PER_TRADE } from "@/domain/trades";
import { useMessage } from "@/hooks/use-message";
import { useTwoClickConfirmFor } from "@/hooks/use-two-click-confirm";
import { domainLabel } from "@/lib/links";
import { cn } from "@/lib/utils";
import { httpsUrlSchema } from "@/schemas/trades";

export interface ScreenshotItem {
  id: string | number;
  url: string;
}

export interface TradeLinkItem {
  id: string | number;
  url: string;
  label: string | null;
}

// Callers own what "add" and "remove" do: stage a blob on a new trade, or
// call the server at once on an existing one. These only pick and confirm.

/**
 * Up to `MAX_SCREENSHOTS_PER_TRADE` tiles and a drop zone that takes a click,
 * a drop or, through the form's paste hook, ⌘V.
 */
export function ScreenshotTiles({
  screenshots,
  pending,
  disabled = false,
  uploads = true,
  error,
  onAdd,
  onRemove,
}: {
  screenshots: readonly ScreenshotItem[];
  pending: boolean;
  disabled?: boolean;
  /** False on the demo account: the tiles show, nothing can be added. */
  uploads?: boolean;
  error: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (id: string | number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const removeConfirm = useTwoClickConfirmFor<string | number>();
  const free = MAX_SCREENSHOTS_PER_TRADE - screenshots.length;

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Screenshots</FieldLabel>
      {screenshots.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {screenshots.map((screenshot) => {
            const armed = removeConfirm.armed === screenshot.id;
            return (
              <div
                key={screenshot.id}
                className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted"
              >
                {/* biome-ignore lint/performance/noImgElement: object URLs and signed storage URLs, nothing next/image can optimise */}
                <img
                  src={screenshot.url}
                  alt=""
                  className="size-full object-cover"
                />
                <Button
                  variant={armed ? "destructive" : "secondary"}
                  size="sm"
                  disabled={disabled || pending}
                  onClick={() =>
                    removeConfirm.press(screenshot.id, () =>
                      onRemove(screenshot.id),
                    )
                  }
                  aria-label={
                    armed ? "Confirm remove screenshot" : "Remove screenshot"
                  }
                  className={cn(
                    "absolute top-1.5 right-1.5 max-lg:h-10 transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100",
                    armed ? "opacity-100" : "opacity-0 max-lg:opacity-100",
                  )}
                >
                  <X aria-hidden="true" />
                  {armed && "Remove"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {!uploads && (
        <p className="text-muted-foreground text-xs">
          Screenshots are off on the demo account.
        </p>
      )}
      {uploads && free > 0 && (
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            onAdd([...event.dataTransfer.files]);
          }}
          className={cn(
            "flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground text-sm outline-none transition-colors duration-150 hover:border-foreground/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
            over
              ? "border-process bg-process/10 text-foreground"
              : "border-input",
          )}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-4" aria-hidden="true" />
          )}
          <span>
            Drop, click or paste with <Kbd>⌘V</Kbd> ·{" "}
            <span className="font-mono tabular-nums">
              {screenshots.length}/{MAX_SCREENSHOTS_PER_TRADE}
            </span>
          </span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length > 0) onAdd(files);
        }}
      />
      <FieldError message={error ?? undefined} />
    </div>
  );
}

/** Arbitrarily many links, https only — the schema the server checks with. */
export function TradeLinks({
  links,
  disabled = false,
  error,
  onAdd,
  onRemove,
}: {
  links: readonly TradeLinkItem[];
  disabled?: boolean;
  error: string | null;
  onAdd: (input: { url: string; label?: string }) => void | Promise<void>;
  onRemove: (id: string | number) => void | Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toText = useMessage();

  function add() {
    const trimmed = url.trim();
    if (trimmed === "") return;
    const parsed = httpsUrlSchema.safeParse(trimmed);
    if (!parsed.success) {
      setInvalid(toText(parsed.error.issues[0].message));
      return;
    }
    setInvalid(null);
    startTransition(async () => {
      await onAdd({ url: trimmed, label: label.trim() || undefined });
      setUrl("");
      setLabel("");
    });
  }

  const message = invalid ?? error;

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor="link-url">Links</FieldLabel>
      {links.map((link) => (
        <div
          key={link.id}
          className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
        >
          <Link2
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="truncate">
            {link.label || domainLabel(link.url)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled || isPending}
            onClick={() => startTransition(() => onRemove(link.id))}
            aria-label="Remove link"
            className="ml-auto text-muted-foreground hover:text-negative max-lg:size-10"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="link-url"
          type="url"
          inputMode="url"
          placeholder="https://… then Enter"
          value={url}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? "link-error" : undefined}
          disabled={disabled || isPending}
          onChange={(event) => {
            setUrl(event.target.value);
            if (invalid) setInvalid(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // With nothing typed, ⌘↵ falls through and logs the trade.
            if ((event.metaKey || event.ctrlKey) && url.trim() === "") return;
            // Enter adds the link here instead of moving on; ⌘↵ with a link
            // typed adds it first, so logging never drops it.
            event.preventDefault();
            add();
          }}
          className="h-10 flex-1"
        />
        <Input
          aria-label="Link label (optional)"
          placeholder="Label (optional)"
          value={label}
          // The label cap of tradeLinkSchema and addTradeLinkSchema.
          maxLength={200}
          disabled={disabled || isPending}
          onChange={(event) => setLabel(event.target.value)}
          className="h-10 sm:w-40"
        />
        <Button
          variant="outline"
          disabled={disabled || isPending || url.trim() === ""}
          onClick={add}
          className="h-10"
        >
          {isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Add
        </Button>
      </div>
      <FieldError id="link-error" message={message ?? undefined} />
    </div>
  );
}
