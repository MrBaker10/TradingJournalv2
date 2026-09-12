"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addTradeLink,
  deleteTradeLink,
  deleteTradeScreenshot,
} from "@/actions/trades";
import { ScreenshotLightbox } from "@/components/journal/screenshot-lightbox";
import { ScreenshotSlots } from "@/components/trades/screenshot-slots";
import { TradeLinksInput } from "@/components/trades/trade-links-input";
import { InlineMessage } from "@/components/ui/inline-message";
import type { JournalTradeRow as JournalTradeRowData } from "@/db/queries/trades";
import { domainLabel } from "@/lib/links";
import { centsToDollars } from "@/lib/money";
import { resizeAndCompressImage } from "@/lib/uploads/resize-image";

interface TradeRowProps {
  trade: JournalTradeRowData;
}

function resultLabel(trade: JournalTradeRowData): string {
  if (!trade.taken) return "Missed";
  return trade.result ?? "—";
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="cap">{label}</span>
      <span className="text-fg">{value}</span>
    </div>
  );
}

// Design.md §4.9: closed row is instrument tile + title line (instrument,
// direction, result/missed, grade) + meta line, and amount/R on the right.
// Missed setups get the same structure, never smaller or paler — the tile
// gradient is the only visual difference. Expanding (260ms) reveals the
// remaining trade fields that don't fit the header.
export function TradeRow({ trade }: TradeRowProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // The route handler is called directly (not a Server Action), so unlike
  // createTrade/deleteTradeLink it doesn't trigger Next's own revalidation —
  // router.refresh() re-runs the Server Component tree to pick up the change.
  async function handleAddScreenshot(file: File) {
    const blob = await resizeAndCompressImage(file);
    const formData = new FormData();
    formData.append("tradeId", String(trade.id));
    formData.append("file", blob, "screenshot.jpg");
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      setScreenshotError(null);
      router.refresh();
      return;
    }
    const body: { error?: string } | null = await response
      .json()
      .catch(() => null);
    setScreenshotError(body?.error ?? "Could not upload that screenshot.");
  }

  async function handleRemoveScreenshot(id: string | number) {
    const result = await deleteTradeScreenshot({
      tradeId: trade.id,
      screenshotId: Number(id),
    });
    if (result.success) {
      setScreenshotError(null);
      router.refresh();
    } else {
      setScreenshotError(result.error);
    }
  }

  async function handleAddLink(input: { url: string; label?: string }) {
    const result = await addTradeLink({ tradeId: trade.id, ...input });
    if (result.success) {
      setLinkError(null);
      router.refresh();
    } else {
      setLinkError(result.error);
    }
  }

  async function handleRemoveLink(id: string | number) {
    const result = await deleteTradeLink({
      tradeId: trade.id,
      linkId: Number(id),
    });
    if (result.success) {
      setLinkError(null);
      router.refresh();
    } else {
      setLinkError(result.error);
    }
  }

  const amount =
    trade.pnlCents !== null ? centsToDollars(trade.pnlCents) : null;
  const amountPositive = amount !== null && amount >= 0;
  const showWouldBeR = !trade.taken && trade.rMultiple !== null;
  const showR = trade.taken && trade.rMultiple !== null;

  return (
    <div className="card-surface edge relative transition-transform duration-150 hover:-translate-y-px hover:[box-shadow:var(--shadow-card),var(--shadow-neon-edge)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xs font-mono text-[11px] font-semibold text-white ${
            trade.taken
              ? "bg-[image:var(--gradient-info)]"
              : "bg-[image:var(--gradient-dark)]"
          }`}
        >
          {trade.instrumentSymbol}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-fg">
              {trade.instrumentSymbol}
            </span>
            <span className="cap rounded-xs bg-well px-1.5 py-0.5">
              {trade.direction === "long" ? "Long" : "Short"}
            </span>
            <span className="cap rounded-xs bg-well px-1.5 py-0.5">
              {resultLabel(trade)}
            </span>
            {trade.grade && (
              <span className="cap rounded-xs bg-well px-1.5 py-0.5">
                Grade {trade.grade}
              </span>
            )}
          </div>
          <span className="truncate text-xs text-fg-subtle">
            {[trade.tradeDate, trade.session, trade.setupType]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {amount !== null ? (
            <span
              className={`font-mono text-sm ${
                amountPositive ? "text-success-fg" : "text-danger-fg"
              }`}
            >
              {amountPositive ? "+" : ""}${amount.toFixed(2)}
            </span>
          ) : (
            <span className="font-mono text-sm text-fg-subtle">—</span>
          )}
          {showR && (
            <span className="text-fg-muted text-xs">
              {(trade.rMultiple as number) >= 0 ? "+" : ""}
              {(trade.rMultiple as number).toFixed(2)}R
            </span>
          )}
          {showWouldBeR && (
            <span className="text-fg-subtle text-xs">
              {(trade.rMultiple as number) >= 0 ? "+" : ""}
              {(trade.rMultiple as number).toFixed(2)}R would-be
            </span>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-white/8 border-t px-3 py-3 text-sm">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {trade.taken && (
                  <DetailField label="Contracts" value={trade.contracts} />
                )}
                <DetailField label="Entry time" value={trade.entryTime} />
                {trade.exitTime !== null && (
                  <DetailField label="Exit time" value={trade.exitTime} />
                )}
                <DetailField label="Entry" value={trade.entryPrice} />
                {trade.exitPrice !== null && (
                  <DetailField label="Exit" value={trade.exitPrice} />
                )}
                {trade.stopPrice !== null && (
                  <DetailField label="Stop" value={trade.stopPrice} />
                )}
                {trade.mfeR !== null && (
                  <DetailField label="MFE (R)" value={trade.mfeR} />
                )}
                {trade.maeR !== null && (
                  <DetailField label="MAE (R)" value={trade.maeR} />
                )}
                {trade.postExitMfeR !== null && (
                  <DetailField
                    label="Post-exit MFE (R)"
                    value={trade.postExitMfeR}
                  />
                )}
                {trade.entryModel && (
                  <DetailField label="Entry model" value={trade.entryModel} />
                )}
                {trade.felt && <DetailField label="Felt" value={trade.felt} />}
                {trade.taken && trade.byTheBook !== null && (
                  <DetailField
                    label="By the book"
                    value={trade.byTheBook ? "Yes" : "No"}
                  />
                )}
              </div>

              {trade.accounts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="cap">Accounts</span>
                  {trade.accounts.map((account) => (
                    <span
                      key={account.id}
                      className="flex items-center gap-1 rounded-xs bg-well px-1.5 py-0.5 text-fg-muted text-xs"
                    >
                      {account.name}
                      {account.isPractice && (
                        <span className="cap-practice rounded-xs px-1 py-0.5">
                          Practice
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {trade.notes && (
                <p className="text-fg-muted text-xs">{trade.notes}</p>
              )}

              {editing ? (
                <div className="flex flex-col gap-3 border-white/8 border-t pt-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="cap">Screenshots</span>
                    <ScreenshotSlots
                      screenshots={trade.screenshots}
                      error={screenshotError}
                      onAdd={handleAddScreenshot}
                      onRemove={handleRemoveScreenshot}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="cap">Links</span>
                    <TradeLinksInput
                      links={trade.links}
                      onAdd={handleAddLink}
                      onRemove={handleRemoveLink}
                    />
                    <InlineMessage message={linkError} />
                  </div>
                </div>
              ) : (
                (trade.screenshots.length > 0 || trade.links.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 border-white/8 border-t pt-3">
                    {trade.screenshots.map((screenshot) => (
                      <button
                        key={screenshot.id}
                        type="button"
                        onClick={() => setLightboxUrl(screenshot.url)}
                        className="h-14 w-14 shrink-0 overflow-hidden rounded-xs border border-white/12 transition-transform hover:-translate-y-px"
                      >
                        {/* biome-ignore lint/performance/noImgElement: signed local-storage URL, not something next/image can optimize */}
                        <img
                          src={screenshot.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                    {trade.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xs bg-[image:var(--gradient-inset)] px-2.5 py-1.5"
                      >
                        <ExternalLink
                          className="h-3.5 w-3.5 text-fg-subtle"
                          aria-hidden="true"
                        />
                        <span className="cap">
                          {link.label || domainLabel(link.url)}
                        </span>
                      </a>
                    ))}
                  </div>
                )
              )}

              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                aria-label={
                  editing
                    ? "Close screenshot and link editing"
                    : "Edit screenshots and links"
                }
                aria-pressed={editing}
                className={`flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-xs transition-colors ${
                  editing ? "text-cyan" : "text-fg-subtle hover:text-fg"
                }`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScreenshotLightbox
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  );
}
