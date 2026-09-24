"use client";

import { useState } from "react";
import { LinkCard } from "@/components/journal/link-card";
import { ScreenshotLightbox } from "@/components/journal/screenshot-lightbox";
import type { JournalTradeRow } from "@/db/queries/trades";
import { formatCents } from "@/lib/money";

interface TradeDetailProps {
  trade: JournalTradeRow;
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="cap">{label}</span>
      <span className="text-fg text-sm">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-surface edge flex flex-col gap-3 p-5">
      <span className="cap">{title}</span>
      {children}
    </div>
  );
}

// Design.md §4.13: a chip carries the inset gradient and a capitals label.
// Confluences and mistakes are process data, not money, so they may wear it —
// §1's line about what is allowed to glow cuts the other way here.
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="edge relative rounded-xs bg-[image:var(--gradient-inset)] px-2.5 py-1.5">
      <span className="cap">{children}</span>
    </span>
  );
}

function formatR(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

export function TradeDetail({ trade }: TradeDetailProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const confluenceGroups = [
    ...trade.confluences
      .reduce((groups, confluence) => {
        const existing = groups.get(confluence.group) ?? [];
        existing.push(confluence.label);
        groups.set(confluence.group, existing);
        return groups;
      }, new Map<string, string[]>())
      .entries(),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="card-surface edge flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-fg text-sm">
              {trade.instrumentSymbol}
            </span>
            <span className="cap rounded-xs bg-well px-1.5 py-0.5">
              {trade.direction === "long" ? "Long" : "Short"}
            </span>
            <span className="cap rounded-xs bg-well px-1.5 py-0.5">
              {trade.taken ? (trade.result ?? "—") : "Missed"}
            </span>
            {trade.grade && (
              <span className="cap rounded-xs bg-well px-1.5 py-0.5">
                Grade {trade.grade}
              </span>
            )}
          </div>
          <span className="text-fg-subtle text-xs">
            {[trade.tradeDate, trade.session, trade.setupType]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="text-fg-subtle text-xs">{trade.instrumentName}</span>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          {/* Design.md §1: realised money gets a semantic colour and nothing
              else. §4.17: anything never realised stays white, so a missed
              setup's would-be R is text-fg even when it is positive. */}
          {trade.pnlCents !== null ? (
            <span
              className={`font-mono text-lg ${
                trade.pnlCents >= 0 ? "text-success-fg" : "text-danger-fg"
              }`}
            >
              {formatCents(trade.pnlCents, { signed: true })}
            </span>
          ) : (
            <span className="font-mono text-fg-subtle text-lg">—</span>
          )}
          {trade.rMultiple !== null &&
            (trade.taken ? (
              <span className="text-fg-muted text-xs">
                {formatR(trade.rMultiple)}
              </span>
            ) : (
              <span className="text-fg-subtle text-xs">
                {formatR(trade.rMultiple)} would-be
              </span>
            ))}
        </div>
      </div>

      <Section title="Execution">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {trade.taken && <Field label="Contracts" value={trade.contracts} />}
          <Field label="Entry time" value={trade.entryTime} />
          <Field label="Exit time" value={trade.exitTime} />
          <Field label="Entry price" value={trade.entryPrice} />
          <Field label="Exit price" value={trade.exitPrice} />
          <Field label="Stop price" value={trade.stopPrice} />
          <Field label="MFE (R)" value={trade.mfeR} />
          <Field label="MAE (R)" value={trade.maeR} />
          <Field label="Post-exit MFE (R)" value={trade.postExitMfeR} />
          <Field label="Entry model" value={trade.entryModel} />
          <Field label="Felt" value={trade.felt} />
          {trade.taken && trade.byTheBook !== null && (
            <Field label="By the book" value={trade.byTheBook ? "Yes" : "No"} />
          )}
        </div>
      </Section>

      {trade.accounts.length > 0 && (
        <Section title="Accounts">
          <div className="flex flex-wrap gap-1.5">
            {trade.accounts.map((account) => (
              <span
                key={account.id}
                className="flex items-center gap-1.5 rounded-xs bg-well px-2.5 py-1.5 text-fg-muted text-sm"
              >
                {account.name}
                {/* §4.12: the marker travels with the account wherever its
                    numbers do. */}
                {account.isPractice && (
                  <span className="cap-practice rounded-xs px-1 py-0.5">
                    Practice
                  </span>
                )}
              </span>
            ))}
          </div>
        </Section>
      )}

      {confluenceGroups.length > 0 && (
        <Section title="Confluences">
          <div className="flex flex-col gap-2.5">
            {confluenceGroups.map(([group, labels]) => (
              <div key={group} className="flex flex-col gap-1.5">
                {group !== "" && (
                  <span className="text-fg-subtle text-xs">{group}</span>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((label) => (
                    <Chip key={label}>{label}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {trade.mistakes.length > 0 && (
        <Section title="Mistakes">
          <div className="flex flex-wrap gap-1.5">
            {trade.mistakes.map((mistake) => (
              <Chip key={mistake.id}>{mistake.label}</Chip>
            ))}
          </div>
        </Section>
      )}

      {trade.notes && (
        <Section title="Notes">
          <p className="whitespace-pre-wrap text-fg-muted text-sm">
            {trade.notes}
          </p>
        </Section>
      )}

      {trade.screenshots.length > 0 && (
        <Section title="Screenshots">
          <div className="flex flex-wrap gap-2">
            {trade.screenshots.map((screenshot) => (
              <button
                key={screenshot.id}
                type="button"
                onClick={() => setLightboxUrl(screenshot.url)}
                className="h-14 w-14 shrink-0 overflow-hidden rounded-xs border border-white/12 transition-transform duration-150 hover:-translate-y-px"
              >
                {/* biome-ignore lint/performance/noImgElement: signed storage URL, not something next/image can optimize */}
                <img
                  src={screenshot.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </Section>
      )}

      {trade.links.length > 0 && (
        <Section title="Links">
          <div className="flex flex-wrap items-start gap-2">
            {trade.links.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        </Section>
      )}

      <ScreenshotLightbox
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  );
}
