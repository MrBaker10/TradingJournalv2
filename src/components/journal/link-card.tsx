"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import type { JournalTradeLink } from "@/db/queries/trades";
import { domainLabel, snapshotImageUrl } from "@/lib/links";

interface LinkCardProps {
  link: JournalTradeLink;
}

/**
 * One external link on a trade, with the chart behind it when it can be shown.
 *
 * Design.md §3.3: a TradingView snapshot needs no fetch at all: its image
 * address follows from the share address by a fixed rule (src/lib/links.ts),
 * and the browser loads it. The server never touches the URL, so
 * coding-standards.md, "Never fetch a user-supplied URL server-side", is not
 * bent here. Every other host stays a plain text link.
 *
 * `onError` matters: a deleted or expired snapshot must collapse back to the
 * text link, not leave a broken image behind.
 */
export function LinkCard({ link }: LinkCardProps) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const preview = snapshotImageUrl(link.url);
  const showPreview = preview !== null && !previewFailed;
  const label = link.label || domainLabel(link.url);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-col overflow-hidden rounded-md border outline-none transition-[translate,border-color,background-color] duration-150 hover:-translate-y-px hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 ${
        showPreview ? "w-full max-w-sm" : "self-start"
      }`}
    >
      {showPreview && (
        // biome-ignore lint/performance/noImgElement: a third-party image the browser fetches directly; next/image would proxy it through the server, which is the one thing this must not do
        <img
          src={preview}
          alt=""
          loading="lazy"
          onError={() => setPreviewFailed(true)}
          className="aspect-video w-full border-b object-cover"
        />
      )}
      <span className="flex items-center gap-2 px-3 py-2 text-sm">
        <ExternalLink
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="truncate">{label}</span>
      </span>
    </a>
  );
}
