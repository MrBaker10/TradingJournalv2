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
 * Design.md §4.13 rules out a preview "because that would be a server-side
 * fetch of a foreign URL". A TradingView snapshot needs no fetch at all: its
 * image address follows from the share address by a fixed rule
 * (src/lib/links.ts), and the browser loads it. The server never touches the
 * URL, so the rule it protects — coding-standards.md, "Never fetch a
 * user-supplied URL server-side" — is not bent here. Every other host stays
 * the plain chip §4.13 describes.
 *
 * `onError` matters: a deleted or expired snapshot must collapse back to the
 * chip, not leave a broken image behind.
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
      className={`edge relative flex flex-col overflow-hidden rounded-xs bg-[image:var(--gradient-inset)] transition-transform duration-150 hover:-translate-y-px ${
        showPreview ? "w-full max-w-sm" : ""
      }`}
    >
      {showPreview && (
        // biome-ignore lint/performance/noImgElement: a third-party image the browser fetches directly; next/image would proxy it through the server, which is the one thing this must not do
        <img
          src={preview}
          alt=""
          loading="lazy"
          onError={() => setPreviewFailed(true)}
          className="aspect-[16/9] w-full border-white/8 border-b object-cover"
        />
      )}
      <span className="flex items-center gap-1.5 px-2.5 py-1.5">
        <ExternalLink
          className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
          aria-hidden="true"
        />
        <span className="cap truncate">{label}</span>
      </span>
    </a>
  );
}
