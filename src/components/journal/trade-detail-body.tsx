"use client";

import { type ElementType, type ReactNode, useState } from "react";
import { LinkCard } from "@/components/journal/link-card";
import { PriceBandChart } from "@/components/journal/price-band";
import { ScreenshotLightbox } from "@/components/journal/screenshot-lightbox";
import { StrategyRules } from "@/components/strategies/strategy-rules";
import type { JournalTradeRow } from "@/db/queries/trades";
import { formatHoldTime } from "@/domain/execution";
import { buildPriceBand } from "@/domain/price-band";
import { moneyTone, SIGN_TEXT, signOf } from "@/lib/dashboard/sign-tone";
import { type DisplayCurrency, formatCents } from "@/lib/money";

function signedR(r: number): string {
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
}

function excursion(value: number | null): string | null {
  return value === null ? null : `${value.toFixed(2)}R`;
}

/** A key/value list; a row without a value is left out. */
function Facts({ rows }: { rows: [label: string, value: ReactNode][] }) {
  const present = rows.filter(([, value]) => value !== null && value !== "");
  if (present.length === 0) return null;
  return (
    <dl className="divide-y">
      {present.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 py-1.5"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t pt-4">
      <h3 className="mb-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chip({
  tone = "default",
  children,
}: {
  tone?: "default" | "mistake" | "practice";
  children: ReactNode;
}) {
  const toneClass = {
    default: "bg-secondary text-secondary-foreground",
    // Dashed like the entry card's mistakes, so a mistake never reads as a
    // confluence even without colour.
    mistake: "border border-dashed border-input",
    practice: "bg-practice/15 text-practice-foreground",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs ${toneClass}`}
    >
      {children}
    </span>
  );
}

const MONO = "font-mono tabular-nums";

/** A figure in mono, or null so `Facts` leaves the row out. */
function monoValue(value: string | number | null): ReactNode {
  return value === null ? null : <span className={MONO}>{value}</span>;
}

/**
 * Everything about one entry (Design.md §3.3), the same in the journal's
 * detail sheet and on the trade's own page: the head, then execution and
 * process side by side with accounts, confluences and mistakes to the right,
 * then notes, the strategy's rules, screenshots with the lightbox and links.
 * It reads only the journal row, so the sheet needs no query of its own.
 *
 * A missed setup is marked and shows no P&L and no R; its prices, times and
 * excursion stay, because they are what the setup was.
 */
export function TradeDetailBody({
  trade,
  currency,
  Title = "h1",
  fxProvisional = false,
}: {
  trade: JournalTradeRow;
  /** The display currency of `displayPnlCents` (display-currency). */
  currency: DisplayCurrency;
  /** The heading element: `h1` on the page, the sheet's title in the sheet. */
  Title?: ElementType<{ className?: string; children?: ReactNode }>;
  /**
   * The P&L was converted with the latest rate before the day's own was
   * published; job:fx converts it again overnight. Only the page reads it.
   */
  fxProvisional?: boolean;
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const pnl = trade.taken ? trade.displayPnlCents : null;
  const r = trade.taken ? trade.rMultiple : null;
  // Only what was actually taken off: a commission on a practice account
  // alone leaves the combined figure untouched (commissions).
  const showBreakdown = pnl !== null && trade.displayCommissionCents !== 0;

  const confluenceGroups = new Map<string, string[]>();
  for (const confluence of trade.confluences) {
    confluenceGroups.set(confluence.group, [
      ...(confluenceGroups.get(confluence.group) ?? []),
      confluence.label,
    ]);
  }

  // With a stop the band shows the prices; without one R is undefined.
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
    confluenceGroups.size > 0 ||
    trade.mistakes.length > 0;

  return (
    <div className="flex flex-col gap-6 text-sm">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Title className="font-semibold text-2xl tracking-tight">
              {trade.instrumentSymbol}
            </Title>
            <Chip>{trade.direction === "long" ? "Long" : "Short"}</Chip>
            {!trade.taken && <Chip>Missed setup</Chip>}
            {trade.taken && trade.result && <Chip>{trade.result}</Chip>}
            {trade.grade && <Chip>Grade {trade.grade}</Chip>}
          </div>
          <p className="text-muted-foreground text-sm">
            <span className={MONO}>{trade.tradeDate}</span>
            {[trade.session, trade.setupType]
              .filter(Boolean)
              .map((part) => ` · ${part}`)
              .join("")}
          </p>
          <p className="text-muted-foreground text-xs">
            {trade.instrumentName}
          </p>
        </div>
        {pnl !== null && (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={`font-semibold text-2xl ${MONO} ${moneyTone(pnl)}`}
            >
              {formatCents(pnl, { signed: true, currency })}
            </span>
            {/* The parts of the figure above, not money of their own. */}
            {showBreakdown && (
              <span className={`text-muted-foreground text-xs ${MONO}`}>
                Gross{" "}
                {formatCents(pnl + trade.displayCommissionCents, {
                  signed: true,
                  currency,
                })}{" "}
                · Commission{" "}
                {formatCents(-trade.displayCommissionCents, { currency })}
              </span>
            )}
            {r !== null && (
              <span className={`text-sm ${MONO} ${SIGN_TEXT[signOf(r)]}`}>
                {signedR(r)}
              </span>
            )}
            {/* A note about the rate, not about the money: no colour. */}
            {fxProvisional && trade.fxRateDate !== null && (
              <span className="text-muted-foreground text-xs">
                Provisional rate ({trade.fxRateDate}), corrected overnight
              </span>
            )}
          </div>
        )}
      </header>

      <div
        className={`grid gap-8 ${hasRail ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}
      >
        <div className="flex min-w-0 flex-col gap-6">
          {hasPriceBand && (
            <Block title="Prices">
              <PriceBandChart
                input={priceBandInput}
                prices={{
                  stop: trade.stopPrice,
                  entry: trade.entryPrice,
                  exit: trade.taken ? trade.exitPrice : null,
                }}
              />
            </Block>
          )}
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
            <Block title="Execution">
              <Facts
                rows={[
                  [
                    "Entry",
                    <span key="entry" className={MONO}>
                      {trade.entryPrice}{" "}
                      <span className="text-muted-foreground">at</span>{" "}
                      {trade.entryTime.slice(0, 5)}
                    </span>,
                  ],
                  [
                    "Exit",
                    trade.exitPrice === null ? null : (
                      <span key="exit" className={MONO}>
                        {trade.exitPrice}
                        {trade.exitTime && (
                          <>
                            {" "}
                            <span className="text-muted-foreground">at</span>{" "}
                            {trade.exitTime.slice(0, 5)}
                          </>
                        )}
                      </span>
                    ),
                  ],
                  ["Stop", monoValue(trade.stopPrice)],
                  [
                    "Contracts",
                    monoValue(trade.taken ? trade.contracts : null),
                  ],
                  [
                    "Held",
                    monoValue(
                      trade.holdMinutes === null
                        ? null
                        : formatHoldTime(trade.holdMinutes),
                    ),
                  ],
                  ["MFE", monoValue(excursion(trade.mfeR))],
                  ["MAE", monoValue(excursion(trade.maeR))],
                  ["Post-exit MFE", monoValue(excursion(trade.postExitMfeR))],
                ]}
              />
            </Block>
            <Block title="Process">
              <Facts
                rows={[
                  ["Setup", trade.setupType],
                  ["Entry model", trade.entryModel],
                  ["Session", trade.session],
                  ["Grade", trade.grade],
                  ["Felt", trade.felt],
                  [
                    "By the book",
                    trade.taken && trade.byTheBook !== null
                      ? trade.byTheBook
                        ? "Yes"
                        : "No"
                      : null,
                  ],
                  [
                    "Strategy",
                    trade.strategy &&
                      `${trade.strategy.name}${trade.strategy.archived ? " (archived)" : ""}`,
                  ],
                ]}
              />
            </Block>
          </div>

          {trade.notes && (
            <Block title="Notes">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {trade.notes}
              </p>
            </Block>
          )}

          {trade.strategy && (
            <Block title={`Rules · ${trade.strategy.name}`}>
              <StrategyRules strategy={trade.strategy} />
            </Block>
          )}

          {trade.screenshots.length > 0 && (
            <Block title="Screenshots">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {trade.screenshots.map((screenshot, index) => (
                  <button
                    key={screenshot.id}
                    type="button"
                    aria-label={`Screenshot ${index + 1} of ${trade.screenshots.length}, full size`}
                    onClick={() => setLightboxUrl(screenshot.url)}
                    className="aspect-video overflow-hidden rounded-md border outline-none transition-[translate,border-color] duration-150 hover:-translate-y-px hover:border-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50"
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
            </Block>
          )}

          {trade.links.length > 0 && (
            <Block title="Links">
              <div className="flex flex-col gap-2">
                {trade.links.map((link) => (
                  <LinkCard key={link.id} link={link} />
                ))}
              </div>
            </Block>
          )}
        </div>

        {hasRail && (
          <aside className="flex flex-col gap-6">
            {trade.accounts.length > 0 && (
              <Block title="Accounts">
                <div className="flex flex-wrap gap-1.5">
                  {trade.accounts.map((account) => (
                    <Chip
                      key={account.id}
                      tone={account.isPractice ? "practice" : "default"}
                    >
                      {account.name}
                      {account.commissionCents !== null && (
                        <span className={MONO} title="Commission">
                          {formatCents(account.commissionCents, { currency })}
                        </span>
                      )}
                      {/* The marker travels with the account wherever its
                          numbers do; named, not only coloured. */}
                      {account.isPractice && <span>· Practice</span>}
                    </Chip>
                  ))}
                </div>
              </Block>
            )}
            {confluenceGroups.size > 0 && (
              <Block title="Confluences">
                <div className="flex flex-col gap-2">
                  {[...confluenceGroups.entries()].map(([group, labels]) => (
                    <div key={group}>
                      {group !== "" && (
                        <div className="mb-1 text-muted-foreground text-xs">
                          {group}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {labels.map((label) => (
                          <Chip key={label}>{label}</Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Block>
            )}
            {trade.mistakes.length > 0 && (
              <Block title="Mistakes">
                <div className="flex flex-wrap gap-1.5">
                  {trade.mistakes.map((mistake) => (
                    <Chip key={mistake.id} tone="mistake">
                      {mistake.label}
                    </Chip>
                  ))}
                </div>
              </Block>
            )}
          </aside>
        )}
      </div>

      <ScreenshotLightbox
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  );
}
