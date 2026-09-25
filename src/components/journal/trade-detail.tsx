"use client";

import { useState } from "react";
import { LinkCard } from "@/components/journal/link-card";
import { PriceBandChart } from "@/components/journal/price-band";
import { ScreenshotLightbox } from "@/components/journal/screenshot-lightbox";
import type { JournalTradeRow } from "@/db/queries/trades";
import { formatHoldTime } from "@/domain/execution";
import { buildPriceBand } from "@/domain/price-band";
import { type DisplayCurrency, formatCents } from "@/lib/money";

interface TradeDetailProps {
  trade: JournalTradeRow;
  /**
   * The P&L was converted with the latest rate before the day's own was
   * published; job:fx converts it again overnight.
   */
  fxProvisional: boolean;
  /** The display currency of `displayPnlCents` (display-currency). */
  currency: DisplayCurrency;
}

type ExecutionValue = { label: string; value: string | null; mono?: boolean };

// Design.md §4.20: execution reads as rows that belong together — prices,
// time, excursion, process — not as a grid of loose tiles. §3 sets every
// number in mono; free text (entry model, felt) stays in sans. An empty value
// is left out, and a row with nothing left disappears.
function ExecutionRow({
  title,
  values,
}: {
  title: string;
  values: ExecutionValue[];
}) {
  const present = values.filter(
    (item) => item.value !== null && item.value !== "",
  );
  if (present.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-6">
      <span className="cap w-24 shrink-0">{title}</span>
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {present.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <dt className="text-fg-subtle text-xs">{item.label}</dt>
            <dd
              className={`font-semibold text-[15px] text-fg ${
                item.mono === false ? "" : "font-mono tabular-nums"
              }`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Section({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`card-surface edge flex flex-col gap-3 p-5 ${className}`}>
      <span className="cap cap-neon">{title}</span>
      {children}
    </div>
  );
}

// Design.md §4.20: a badge sits on the calm surface from §4.14. Confluences
// and accounts wear the blue one the Edit button wears; a mistake wears the
// neutral twin, so a mistake never looks like something earned.
function Chip({
  tone = "info",
  children,
}: {
  tone?: "info" | "neutral";
  children: React.ReactNode;
}) {
  const surface =
    tone === "info"
      ? "bg-[image:var(--gradient-info-soft)] shadow-[var(--shadow-info-soft)]"
      : "bg-[image:var(--gradient-dark-soft)] shadow-[var(--shadow-dark-soft)]";
  return (
    <span
      className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 ${surface}`}
    >
      {children}
    </span>
  );
}

// Design.md §4.20: badge labels are names the user chose, so they read in
// sentence case, not as capitals. Only the practice marker stays a `cap` tag.
const chipLabel = "font-medium text-[13px] text-fg";

// Header tags carry facts, not process: the neutral surface, readable white.
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="cap rounded-xs bg-[image:var(--gradient-dark-soft)] px-1.5 py-0.5 text-fg shadow-[var(--shadow-dark-soft)]">
      {children}
    </span>
  );
}

function formatExcursion(value: number | null): string | null {
  return value === null ? null : `${value.toFixed(2)}R`;
}

function formatR(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

export function TradeDetail({
  trade,
  fxProvisional,
  currency,
}: TradeDetailProps) {
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

  // Design.md §4.21: with a stop the band replaces the prices row; without
  // one R is undefined and the plain row stays.
  const priceBandInput = {
    taken: trade.taken,
    entryPrice: trade.entryPrice,
    stopPrice: trade.stopPrice,
    rMultiple: trade.rMultiple,
    mfeR: trade.mfeR,
    maeR: trade.maeR,
    postExitMfeR: trade.postExitMfeR,
  };
  const hasPriceBand = buildPriceBand(priceBandInput) !== null;

  const hasRail =
    trade.accounts.length > 0 ||
    confluenceGroups.length > 0 ||
    trade.mistakes.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Design.md §4.20: the header is the one loud place on the page —
          the instrument as the page title, the result as a metric value. */}
      <div className="card-surface edge flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title text-fg">{trade.instrumentSymbol}</h1>
            <Tag>{trade.direction === "long" ? "Long" : "Short"}</Tag>
            <Tag>{trade.taken ? (trade.result ?? "—") : "Missed"}</Tag>
            {trade.grade && <Tag>Grade {trade.grade}</Tag>}
          </div>
          <span className="text-fg-muted text-xs">
            <span className="font-mono tabular-nums">{trade.tradeDate}</span>
            {[trade.session, trade.setupType]
              .filter(Boolean)
              .map((part) => ` · ${part}`)
              .join("")}
          </span>
          <span className="text-fg-muted text-xs">{trade.instrumentName}</span>
        </div>

        <div className="flex flex-col items-end gap-1">
          {/* Design.md §1: realised money gets a semantic colour and nothing
              else — bigger here, but still no glow. §4.17: anything never
              realised stays out of green, so a missed setup's would-be R is
              subtle even when it is positive. */}
          {trade.displayPnlCents !== null ? (
            <span
              className={`font-bold font-mono text-[26px] tabular-nums leading-none ${
                trade.displayPnlCents >= 0
                  ? "text-success-fg"
                  : "text-danger-fg"
              }`}
            >
              {formatCents(trade.displayPnlCents, { signed: true, currency })}
            </span>
          ) : (
            <span className="font-bold font-mono text-[26px] text-fg-subtle leading-none">
              —
            </span>
          )}
          {trade.rMultiple !== null &&
            (trade.taken ? (
              <span className="font-mono text-fg-muted text-sm tabular-nums">
                {formatR(trade.rMultiple)}
              </span>
            ) : (
              <span className="font-mono text-fg-subtle text-sm tabular-nums">
                {formatR(trade.rMultiple)} would-be
              </span>
            ))}
          {/* Neutral on purpose: a note about the rate, not about the money
              (Design.md §1 — money gets its colour and nothing else). */}
          {fxProvisional && trade.fxRateDate !== null && (
            <span className="text-[11.5px] text-fg-subtle">
              Provisional rate ({trade.fxRateDate}), corrected overnight
            </span>
          )}
        </div>
      </div>

      {/* Design.md §4.20: from `lg` the trade reads on the left and its
          labels sit in a narrow rail on the right. The rail spans the left
          column's rows; the last row takes up any extra height so the left
          cards never spread apart. Below `lg` the DOM order is the old
          single-column order. */}
      <div
        className={`grid grid-cols-1 items-start gap-4 ${
          hasRail
            ? "lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_auto_1fr]"
            : ""
        }`}
      >
        <Section title="Execution" className="lg:col-start-1">
          <div className="flex flex-col divide-y divide-white/8">
            {hasPriceBand ? (
              <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:gap-6">
                <span className="cap w-24 shrink-0">Prices</span>
                <div className="min-w-0 flex-1 px-1">
                  <PriceBandChart
                    input={priceBandInput}
                    prices={{
                      stop: trade.stopPrice,
                      entry: trade.entryPrice,
                      exit: trade.taken ? trade.exitPrice : null,
                    }}
                  />
                </div>
              </div>
            ) : (
              <ExecutionRow
                title="Prices"
                values={[
                  { label: "Stop", value: trade.stopPrice?.toString() ?? null },
                  { label: "Entry", value: trade.entryPrice.toString() },
                  { label: "Exit", value: trade.exitPrice?.toString() ?? null },
                ]}
              />
            )}
            <ExecutionRow
              title="Time"
              values={[
                { label: "Entry", value: trade.entryTime },
                { label: "Exit", value: trade.exitTime },
                {
                  label: "Held",
                  value:
                    trade.holdMinutes === null
                      ? null
                      : formatHoldTime(trade.holdMinutes),
                },
              ]}
            />
            <ExecutionRow
              title="Excursion"
              values={[
                { label: "MFE", value: formatExcursion(trade.mfeR) },
                { label: "MAE", value: formatExcursion(trade.maeR) },
                {
                  label: "Post-exit MFE",
                  value: formatExcursion(trade.postExitMfeR),
                },
              ]}
            />
            <ExecutionRow
              title="Process"
              values={[
                {
                  label: "Contracts",
                  value: trade.taken
                    ? (trade.contracts?.toString() ?? null)
                    : null,
                },
                { label: "Entry model", value: trade.entryModel, mono: false },
                { label: "Felt", value: trade.felt, mono: false },
                {
                  label: "By the book",
                  value:
                    trade.taken && trade.byTheBook !== null
                      ? trade.byTheBook
                        ? "Yes"
                        : "No"
                      : null,
                  mono: false,
                },
              ]}
            />
          </div>
        </Section>

        {hasRail && (
          <div className="flex flex-col gap-4 lg:col-start-2 lg:row-span-4 lg:row-start-1">
            {trade.accounts.length > 0 && (
              <Section title="Accounts">
                <div className="flex flex-wrap gap-1.5">
                  {trade.accounts.map((account) => (
                    <Chip key={account.id}>
                      <span className={chipLabel}>{account.name}</span>
                      {/* §4.12: the marker travels with the account wherever its
                    numbers do. */}
                      {account.isPractice && (
                        <span className="cap cap-practice rounded-xs px-1 py-0.5">
                          Practice
                        </span>
                      )}
                    </Chip>
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
                          <Chip key={label}>
                            <span className={chipLabel}>{label}</span>
                          </Chip>
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
                    <Chip key={mistake.id} tone="neutral">
                      <span className={chipLabel}>{mistake.label}</span>
                    </Chip>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {trade.notes && (
          <Section title="Notes" className="lg:col-start-1">
            <p className="whitespace-pre-wrap text-fg-muted text-sm">
              {trade.notes}
            </p>
          </Section>
        )}

        {trade.screenshots.length > 0 && (
          <Section title="Screenshots" className="lg:col-start-1">
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
          <Section title="Links" className="lg:col-start-1">
            <div className="flex flex-wrap items-start gap-2">
              {trade.links.map((link) => (
                <LinkCard key={link.id} link={link} />
              ))}
            </div>
          </Section>
        )}
      </div>

      <ScreenshotLightbox
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  );
}
