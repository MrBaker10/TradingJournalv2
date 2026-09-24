"use client";

import { Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  addTradeLink,
  createTrade,
  deleteTrade,
  deleteTradeLink,
  deleteTradeScreenshot,
  updateTrade,
} from "@/actions/trades";
import { AccountMultiSelect } from "@/components/trades/account-multi-select";
import { ScreenshotSlots } from "@/components/trades/screenshot-slots";
import type { TagGroup } from "@/components/trades/tag-multi-select";
import { TagMultiSelect } from "@/components/trades/tag-multi-select";
import type { TradeLinkItem } from "@/components/trades/trade-links-input";
import { TradeLinksInput } from "@/components/trades/trade-links-input";
import { InlineMessage } from "@/components/ui/inline-message";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import type { JournalTradeRow } from "@/db/queries/trades";
import { calculatePnl, type TradeDirection } from "@/domain/pnl";
import { MAX_SCREENSHOTS_PER_TRADE } from "@/domain/trades";
import { centsToDollars } from "@/lib/money";
import { resizeAndCompressImage } from "@/lib/uploads/resize-image";
import {
  createTradeSchema,
  directionEnum,
  entryModelEnum,
  feltEnum,
  gradeEnum,
  resultEnum,
  sessionEnum,
  setupTypeEnum,
} from "@/schemas/trades";

interface StagedScreenshot {
  id: string;
  blob: Blob;
  url: string;
}

const SUCCESS_HOLD_MS = 1400;
const CONFIRM_TIMEOUT_MS = 3000;

type FieldState = "default" | "valid" | "invalid";

// Design.md §4.5: every field needs default/hover/focus/valid/invalid/disabled.
// "Valid" is a lightweight heuristic (has a value, no active error) rather than
// a full per-field Zod check — matches the threshold-based example in §4.6.
function getFieldClass(state: FieldState): string {
  const border =
    state === "invalid"
      ? "border-danger-fg/60 focus:border-danger-fg"
      : state === "valid"
        ? "border-success-fg/45 hover:border-cyan/35 focus:border-cyan"
        : "border-white/12 hover:border-cyan/35 focus:border-cyan";
  return `h-10 w-full rounded-ctl border ${border} bg-well px-3 text-sm text-fg transition-colors duration-200 placeholder:text-fg-placeholder focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60`;
}

function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="cap">
        {label}
      </label>
      {children}
      <InlineMessage message={error ?? null} />
    </div>
  );
}

// What the button says while it holds its success state (Design.md §4.2).
// A missed setup has no realised figure, so it says what happened instead.
function summaryOf(result: {
  pnlCents: number | null;
  rMultiple: number | null;
}): string {
  if (result.pnlCents === null) return "Missed setup saved";
  const amount = `${result.pnlCents >= 0 ? "+" : ""}$${centsToDollars(result.pnlCents).toFixed(2)}`;
  if (result.rMultiple === null) return amount;
  return `${amount}, ${result.rMultiple >= 0 ? "+" : ""}${result.rMultiple.toFixed(2)}R`;
}

function parseNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface InstrumentOption {
  id: number;
  symbol: string;
  name: string;
  pointValue: string;
}

interface AccountOption {
  id: number;
  name: string;
  isPractice?: boolean;
  isArchived?: boolean;
}

interface TradeFormBaseProps {
  instruments: InstrumentOption[];
  accounts: AccountOption[];
  confluenceGroups: TagGroup[];
  mistakeTags: { id: number; label: string }[];
}

/**
 * One form for both jobs. The fields, their validation and the live P&L are
 * identical whether a trade is being written for the first time or corrected
 * later — duplicating them would guarantee the two drift.
 *
 * What genuinely differs is attachments. A new trade has no id yet, so
 * screenshots are staged as blobs and uploaded after the insert, and links
 * ride along in the payload. An existing trade already has an id, so both go
 * to the server the moment they are added — the same live path the journal row
 * used before this form took the job over.
 */
type TradeFormProps = TradeFormBaseProps &
  ({ mode: "create" } | { mode: "edit"; trade: JournalTradeRow });

type FormState = {
  taken: boolean;
  tradeDate: string;
  instrumentId: string;
  direction: "" | TradeDirection;
  entryTime: string;
  exitTime: string;
  entryPrice: string;
  exitPrice: string;
  stopPrice: string;
  contracts: string;
  session: string;
  setupType: string;
  entryModel: string;
  confluenceTagIds: number[];
  mistakeTagIds: number[];
  mfeR: string;
  maeR: string;
  postExitMfeR: string;
  pnlOverride: string;
  result: string;
  grade: string;
  felt: string;
  byTheBook: boolean;
  notes: string;
  accountIds: number[];
};

const emptyState: FormState = {
  taken: true,
  tradeDate: "",
  instrumentId: "",
  direction: "",
  entryTime: "",
  exitTime: "",
  entryPrice: "",
  exitPrice: "",
  stopPrice: "",
  contracts: "",
  session: "",
  setupType: "",
  entryModel: "",
  confluenceTagIds: [],
  mistakeTagIds: [],
  mfeR: "",
  maeR: "",
  postExitMfeR: "",
  pnlOverride: "",
  result: "",
  grade: "",
  felt: "",
  byTheBook: false,
  notes: "",
  accountIds: [],
};

// Every field is a controlled string, so a stored value has to come back as
// the string the input would have held. `null` means "not filled in" and maps
// to "" rather than "null" — the same empty the create path starts from, which
// is what lets both modes share buildPayload unchanged.
function stateFromTrade(trade: JournalTradeRow): FormState {
  const numberField = (value: number | null) =>
    value !== null ? String(value) : "";

  return {
    taken: trade.taken,
    tradeDate: trade.tradeDate,
    instrumentId: String(trade.instrumentId),
    direction: trade.direction,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime ?? "",
    entryPrice: String(trade.entryPrice),
    exitPrice: numberField(trade.exitPrice),
    stopPrice: numberField(trade.stopPrice),
    contracts: numberField(trade.contracts),
    session: trade.session ?? "",
    setupType: trade.setupType ?? "",
    entryModel: trade.entryModel ?? "",
    confluenceTagIds: trade.confluences.map((confluence) => confluence.id),
    mistakeTagIds: trade.mistakes.map((mistake) => mistake.id),
    mfeR: numberField(trade.mfeR),
    maeR: numberField(trade.maeR),
    postExitMfeR: numberField(trade.postExitMfeR),
    pnlOverride: numberField(trade.pnlOverride),
    result: trade.result ?? "",
    grade: trade.grade ?? "",
    felt: trade.felt ?? "",
    byTheBook: trade.byTheBook ?? false,
    notes: trade.notes ?? "",
    accountIds: trade.accounts.map((account) => account.id),
  };
}

export function TradeForm(props: TradeFormProps) {
  const { instruments, accounts, confluenceGroups, mistakeTags } = props;
  // Narrowed once so the callbacks below can read it without re-checking
  // props.mode inside every closure.
  const edit = props.mode === "edit" ? props : null;

  const router = useRouter();
  const [state, setState] = useState<FormState>(
    edit ? stateFromTrade(edit.trade) : emptyState,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successSummary, setSuccessSummary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [stagedLinks, setStagedLinks] = useState<TradeLinkItem[]>([]);
  const [stagedScreenshots, setStagedScreenshots] = useState<
    StagedScreenshot[]
  >([]);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // In edit mode the server is the source of truth for both lists; in create
  // mode nothing exists on the server yet, so the staged arrays are.
  const screenshots = edit ? edit.trade.screenshots : stagedScreenshots;
  const links: TradeLinkItem[] = edit ? edit.trade.links : stagedLinks;

  const loading = isPending;
  const success = successSummary !== null;

  const instrument = instruments.find(
    (candidate) => candidate.id === Number(state.instrumentId),
  );

  const livePreview = useMemo(() => {
    if (!state.taken || !instrument) return null;
    if (state.direction !== "long" && state.direction !== "short") return null;
    const entryPrice = parseNumber(state.entryPrice);
    const exitPrice = parseNumber(state.exitPrice);
    const contracts = parseNumber(state.contracts);
    if (
      entryPrice === undefined ||
      exitPrice === undefined ||
      contracts === undefined
    ) {
      return null;
    }
    try {
      return calculatePnl({
        direction: state.direction,
        entryPrice,
        exitPrice,
        contracts,
        pointValue: Number(instrument.pointValue),
        stopPrice: parseNumber(state.stopPrice),
      });
    } catch {
      return null;
    }
  }, [
    state.taken,
    state.direction,
    state.entryPrice,
    state.exitPrice,
    state.contracts,
    state.stopPrice,
    instrument,
  ]);

  const showPostExitMfe =
    state.taken && parseNumber(state.stopPrice) !== undefined;

  function fieldState(key: string, filled: boolean): FieldState {
    if (errors[key]) return "invalid";
    return filled ? "valid" : "default";
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  // The upload endpoint is a route handler, not a Server Action, so it does
  // not trigger Next's own revalidation — router.refresh() re-runs the page's
  // Server Component tree to pick the new screenshot up.
  async function uploadScreenshot(tradeId: number, blob: Blob) {
    const formData = new FormData();
    formData.append("tradeId", String(tradeId));
    formData.append("file", blob, "screenshot.jpg");
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });
    if (response.ok) return null;
    const body: { error?: string } | null = await response
      .json()
      .catch(() => null);
    return body?.error ?? "Could not upload that screenshot.";
  }

  async function handleAddScreenshot(file: File) {
    if (screenshots.length >= MAX_SCREENSHOTS_PER_TRADE) {
      setScreenshotError(
        `A trade can have at most ${MAX_SCREENSHOTS_PER_TRADE} screenshots.`,
      );
      return;
    }

    let blob: Blob;
    try {
      blob = await resizeAndCompressImage(file);
    } catch {
      setScreenshotError("Could not process that image.");
      return;
    }

    if (edit) {
      const error = await uploadScreenshot(edit.trade.id, blob);
      setScreenshotError(error);
      if (!error) router.refresh();
      return;
    }

    setStagedScreenshots((prev) => [
      ...prev,
      { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) },
    ]);
    setScreenshotError(null);
  }

  async function handleRemoveScreenshot(id: string | number) {
    if (edit) {
      const result = await deleteTradeScreenshot({
        tradeId: edit.trade.id,
        screenshotId: Number(id),
      });
      setScreenshotError(result.success ? null : result.error);
      if (result.success) router.refresh();
      return;
    }

    setStagedScreenshots((prev) => {
      const removed = prev.find((screenshot) => screenshot.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((screenshot) => screenshot.id !== id);
    });
  }

  async function handleAddLink(input: { url: string; label?: string }) {
    if (edit) {
      const result = await addTradeLink({ tradeId: edit.trade.id, ...input });
      setLinkError(result.success ? null : result.error);
      if (result.success) router.refresh();
      return;
    }

    setStagedLinks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        url: input.url,
        label: input.label ?? null,
      },
    ]);
  }

  async function handleRemoveLink(id: string | number) {
    if (edit) {
      const result = await deleteTradeLink({
        tradeId: edit.trade.id,
        linkId: Number(id),
      });
      setLinkError(result.success ? null : result.error);
      if (result.success) router.refresh();
      return;
    }

    setStagedLinks((prev) => prev.filter((link) => link.id !== id));
  }

  // Two clicks, no modal — the same confirm shape the screenshot tiles use,
  // and Design.md §4.6's rule that a decision belongs where it is made.
  function handleDeleteClick() {
    if (!edit) return;

    if (!confirmingDelete) {
      setConfirmingDelete(true);
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
      confirmTimeout.current = setTimeout(
        () => setConfirmingDelete(false),
        CONFIRM_TIMEOUT_MS,
      );
      return;
    }

    if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
    setConfirmingDelete(false);
    startTransition(async () => {
      const result = await deleteTrade({ tradeId: edit.trade.id });
      if (!result.success) {
        setErrors({ form: result.error });
        return;
      }
      router.push("/journal");
      router.refresh();
    });
  }

  function buildPayload() {
    const shared = {
      tradeDate: state.tradeDate,
      instrumentId:
        state.instrumentId === "" ? undefined : Number(state.instrumentId),
      direction: state.direction === "" ? undefined : state.direction,
      entryTime: state.entryTime,
      entryPrice: parseNumber(state.entryPrice),
      stopPrice: parseNumber(state.stopPrice),
      session: state.session === "" ? undefined : state.session,
      setupType: state.setupType === "" ? undefined : state.setupType,
      entryModel: state.entryModel === "" ? undefined : state.entryModel,
      confluenceTagIds: state.confluenceTagIds,
      mistakeTagIds: state.mistakeTagIds,
      mfeR: parseNumber(state.mfeR),
      maeR: parseNumber(state.maeR),
      notes: state.notes.trim() === "" ? undefined : state.notes,
      felt: state.felt === "" ? undefined : state.felt,
      grade: state.grade === "" ? undefined : state.grade,
      // Only the create path carries links in the payload. On an existing
      // trade they are already rows of their own, added and removed live, and
      // updateTrade ignores this field for exactly that reason.
      links: edit
        ? []
        : stagedLinks.map((link) => ({
            url: link.url,
            label: link.label ?? undefined,
          })),
    };

    if (!state.taken) {
      return { ...shared, taken: false as const };
    }

    return {
      ...shared,
      taken: true as const,
      exitTime: state.exitTime,
      exitPrice: parseNumber(state.exitPrice),
      contracts: parseNumber(state.contracts),
      pnlOverride: parseNumber(state.pnlOverride),
      result: state.result === "" ? undefined : state.result,
      byTheBook: state.byTheBook,
      postExitMfeR: parseNumber(state.postExitMfeR),
      accountIds: state.accountIds,
    };
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = createTradeSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      if (edit) {
        const result = await updateTrade({
          tradeId: edit.trade.id,
          trade: parsed.data,
        });
        if (!result.success) {
          setErrors({ form: result.error });
          return;
        }

        setSuccessSummary(summaryOf(result.data));
        setErrors({});
        setTimeout(() => {
          router.push(`/journal/${edit.trade.id}`);
          router.refresh();
        }, SUCCESS_HOLD_MS);
        return;
      }

      const result = await createTrade(parsed.data);
      if (!result.success) {
        setErrors({ form: result.error });
        return;
      }

      // Screenshots can only be uploaded once the trade exists (trade_id is
      // NOT NULL) — same /api/uploads endpoint the edit mode uses, just called
      // right after creation instead of later.
      let screenshotUploadError: string | null = null;
      for (const screenshot of stagedScreenshots) {
        const uploadError = await uploadScreenshot(
          result.data.id,
          screenshot.blob,
        );
        if (uploadError) {
          screenshotUploadError =
            "Trade saved, but a screenshot failed to upload.";
        }
      }

      setSuccessSummary(summaryOf(result.data));
      setErrors(screenshotUploadError ? { form: screenshotUploadError } : {});
      setTimeout(() => {
        setState(emptyState);
        setSuccessSummary(null);
        for (const screenshot of stagedScreenshots) {
          URL.revokeObjectURL(screenshot.url);
        }
        setStagedScreenshots([]);
        setStagedLinks([]);
      }, SUCCESS_HOLD_MS);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="card-surface edge flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-fg">Missed setup</span>
            <span className="text-xs text-fg-subtle">
              Nothing was executed — only the setup itself is logged.
            </span>
          </div>
          <ToggleSwitch
            checked={!state.taken}
            onCheckedChange={(missed) => set("taken", !missed)}
            disabled={loading || success}
            ariaLabel="Missed setup"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Date" htmlFor="tradeDate" error={errors.tradeDate}>
            <input
              id="tradeDate"
              type="date"
              value={state.tradeDate}
              onChange={(event) => set("tradeDate", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("tradeDate", state.tradeDate !== ""),
              )}
            />
          </FormField>

          <FormField
            label="Instrument"
            htmlFor="instrumentId"
            error={errors.instrumentId}
          >
            <select
              id="instrumentId"
              value={state.instrumentId}
              onChange={(event) => set("instrumentId", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("instrumentId", state.instrumentId !== ""),
              )}
            >
              <option value="">Select…</option>
              {instruments.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.symbol} — {option.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Direction"
            htmlFor="direction"
            error={errors.direction}
          >
            <select
              id="direction"
              value={state.direction}
              onChange={(event) =>
                set("direction", event.target.value as "" | TradeDirection)
              }
              disabled={loading || success}
              className={getFieldClass(
                fieldState("direction", state.direction !== ""),
              )}
            >
              <option value="">Select…</option>
              {directionEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option === "long" ? "Long" : "Short"}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            label="Entry time"
            htmlFor="entryTime"
            error={errors.entryTime}
          >
            <input
              id="entryTime"
              type="time"
              step={1}
              value={state.entryTime}
              onChange={(event) => set("entryTime", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("entryTime", state.entryTime !== ""),
              )}
            />
          </FormField>

          {state.taken && (
            <FormField
              label="Exit time"
              htmlFor="exitTime"
              error={errors.exitTime}
            >
              <input
                id="exitTime"
                type="time"
                step={1}
                value={state.exitTime}
                onChange={(event) => set("exitTime", event.target.value)}
                disabled={loading || success}
                className={getFieldClass(
                  fieldState("exitTime", state.exitTime !== ""),
                )}
              />
            </FormField>
          )}

          {state.taken && (
            <FormField
              label="Contracts"
              htmlFor="contracts"
              error={errors.contracts}
            >
              <input
                id="contracts"
                type="number"
                min={1}
                step={1}
                value={state.contracts}
                onChange={(event) => set("contracts", event.target.value)}
                disabled={loading || success}
                className={getFieldClass(
                  fieldState("contracts", state.contracts.trim() !== ""),
                )}
              />
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            label="Entry price"
            htmlFor="entryPrice"
            error={errors.entryPrice}
          >
            <input
              id="entryPrice"
              type="number"
              step="0.0001"
              value={state.entryPrice}
              onChange={(event) => set("entryPrice", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("entryPrice", state.entryPrice.trim() !== ""),
              )}
            />
          </FormField>

          {state.taken && (
            <FormField
              label="Exit price"
              htmlFor="exitPrice"
              error={errors.exitPrice}
            >
              <input
                id="exitPrice"
                type="number"
                step="0.0001"
                value={state.exitPrice}
                onChange={(event) => set("exitPrice", event.target.value)}
                disabled={loading || success}
                className={getFieldClass(
                  fieldState("exitPrice", state.exitPrice.trim() !== ""),
                )}
              />
            </FormField>
          )}

          <FormField
            label="Stop price"
            htmlFor="stopPrice"
            error={errors.stopPrice}
          >
            <input
              id="stopPrice"
              type="number"
              step="0.0001"
              value={state.stopPrice}
              onChange={(event) => set("stopPrice", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("stopPrice", state.stopPrice.trim() !== ""),
              )}
            />
          </FormField>
        </div>

        {state.taken && (
          <div className="flex min-h-[52px] items-center justify-between rounded-ctl border border-white/12 bg-well px-4">
            <span className="cap">Live P&amp;L / R</span>
            {livePreview ? (
              <span className="font-mono text-sm">
                <span
                  className={
                    livePreview.pnlCents >= 0
                      ? "text-success-fg"
                      : "text-danger-fg"
                  }
                >
                  {livePreview.pnlCents >= 0 ? "+" : ""}$
                  {centsToDollars(livePreview.pnlCents).toFixed(2)}
                </span>
                {livePreview.rMultiple !== null && (
                  <span className="ml-2 text-fg-muted">
                    {livePreview.rMultiple >= 0 ? "+" : ""}
                    {livePreview.rMultiple.toFixed(2)}R
                  </span>
                )}
              </span>
            ) : (
              <span className="text-sm text-fg-subtle">—</span>
            )}
          </div>
        )}
      </div>

      <div className="card-surface edge flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Session" htmlFor="session" error={errors.session}>
            <select
              id="session"
              value={state.session}
              onChange={(event) => set("session", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("session", state.session !== ""),
              )}
            >
              <option value="">—</option>
              {sessionEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Setup type"
            htmlFor="setupType"
            error={errors.setupType}
          >
            <select
              id="setupType"
              value={state.setupType}
              onChange={(event) => set("setupType", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("setupType", state.setupType !== ""),
              )}
            >
              <option value="">—</option>
              {setupTypeEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Entry model"
            htmlFor="entryModel"
            error={errors.entryModel}
          >
            <select
              id="entryModel"
              value={state.entryModel}
              onChange={(event) => set("entryModel", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("entryModel", state.entryModel !== ""),
              )}
            >
              <option value="">—</option>
              {entryModelEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="cap">Confluences</span>
          <TagMultiSelect
            groups={confluenceGroups}
            selectedIds={state.confluenceTagIds}
            onChange={(ids) => set("confluenceTagIds", ids)}
            disabled={loading || success}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="cap">Mistakes</span>
          <TagMultiSelect
            groups={[{ group: "", tags: mistakeTags }]}
            selectedIds={state.mistakeTagIds}
            onChange={(ids) => set("mistakeTagIds", ids)}
            disabled={loading || success}
          />
        </div>
      </div>

      <div className="card-surface edge flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="MFE (R)" htmlFor="mfeR" error={errors.mfeR}>
            <input
              id="mfeR"
              type="number"
              step="0.01"
              value={state.mfeR}
              onChange={(event) => set("mfeR", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("mfeR", state.mfeR.trim() !== ""),
              )}
            />
          </FormField>

          <FormField label="MAE (R)" htmlFor="maeR" error={errors.maeR}>
            <input
              id="maeR"
              type="number"
              step="0.01"
              value={state.maeR}
              onChange={(event) => set("maeR", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("maeR", state.maeR.trim() !== ""),
              )}
            />
          </FormField>

          {showPostExitMfe && (
            <FormField
              label="Post-exit MFE (R)"
              htmlFor="postExitMfeR"
              error={errors.postExitMfeR}
            >
              <input
                id="postExitMfeR"
                type="number"
                step="0.01"
                value={state.postExitMfeR}
                onChange={(event) => set("postExitMfeR", event.target.value)}
                disabled={loading || success}
                className={getFieldClass(
                  fieldState("postExitMfeR", state.postExitMfeR.trim() !== ""),
                )}
              />
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Grade" htmlFor="grade" error={errors.grade}>
            <select
              id="grade"
              value={state.grade}
              onChange={(event) => set("grade", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(fieldState("grade", state.grade !== ""))}
            >
              <option value="">—</option>
              {gradeEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Felt" htmlFor="felt" error={errors.felt}>
            <select
              id="felt"
              value={state.felt}
              onChange={(event) => set("felt", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(fieldState("felt", state.felt !== ""))}
            >
              <option value="">—</option>
              {feltEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          {state.taken && (
            <FormField label="Result" htmlFor="result" error={errors.result}>
              <select
                id="result"
                value={state.result}
                onChange={(event) => set("result", event.target.value)}
                disabled={loading || success}
                className={getFieldClass(
                  fieldState("result", state.result !== ""),
                )}
              >
                <option value="">—</option>
                {resultEnum.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </div>

        {state.taken && (
          <FormField
            label="P&amp;L override"
            htmlFor="pnlOverride"
            error={errors.pnlOverride}
          >
            <input
              id="pnlOverride"
              type="number"
              step="0.01"
              placeholder="Leave empty to use the derived P&L"
              value={state.pnlOverride}
              onChange={(event) => set("pnlOverride", event.target.value)}
              disabled={loading || success}
              className={getFieldClass(
                fieldState("pnlOverride", state.pnlOverride.trim() !== ""),
              )}
            />
          </FormField>
        )}

        {state.taken && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-fg">By the book</span>
            <ToggleSwitch
              checked={state.byTheBook}
              onCheckedChange={(value) => set("byTheBook", value)}
              disabled={loading || success}
              ariaLabel="By the book"
            />
          </div>
        )}

        <FormField label="Notes" htmlFor="notes" error={errors.notes}>
          <textarea
            id="notes"
            rows={3}
            value={state.notes}
            onChange={(event) => set("notes", event.target.value)}
            disabled={loading || success}
            className={`${getFieldClass(
              fieldState("notes", state.notes.trim() !== ""),
            )} h-auto resize-none py-2`}
          />
        </FormField>
      </div>

      {state.taken && (
        <div className="card-surface edge flex flex-col gap-3 p-5">
          <span className="cap">Accounts</span>
          <AccountMultiSelect
            accounts={accounts}
            selectedIds={state.accountIds}
            onChange={(ids) => set("accountIds", ids)}
            disabled={loading || success}
          />
          <InlineMessage message={errors.accountIds ?? null} />
        </div>
      )}

      <div className="card-surface edge flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <span className="cap">Screenshots</span>
          <ScreenshotSlots
            screenshots={screenshots}
            disabled={loading || success}
            error={screenshotError}
            onAdd={handleAddScreenshot}
            onRemove={handleRemoveScreenshot}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="cap">Links</span>
          <TradeLinksInput
            links={links}
            disabled={loading || success}
            onAdd={handleAddLink}
            onRemove={handleRemoveLink}
          />
          <InlineMessage message={linkError ?? errors.links ?? null} />
        </div>

        {edit && (
          <p className="text-fg-subtle text-xs">
            Screenshots and links are saved the moment you add or remove them.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="submit"
          disabled={loading || success}
          className={`relative h-11 w-full rounded-ctl text-sm font-medium text-fg shadow-[var(--shadow-button-primary)] ${
            success
              ? "bg-[image:var(--gradient-success)]"
              : "bg-[image:var(--gradient-info)]"
          }`}
        >
          <span
            className={`inline-flex items-center justify-center transition-opacity duration-200 ease-linear ${
              loading || success ? "opacity-0" : "opacity-100"
            }`}
          >
            {edit
              ? "Save changes"
              : state.taken
                ? "Log trade"
                : "Log missed setup"}
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-linear ${
              loading ? "opacity-100" : "opacity-0"
            }`}
          >
            <PendingIndicator label="Saving…" />
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-200 ease-linear ${
              success ? "opacity-100" : "opacity-0"
            }`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {successSummary}
          </span>
        </button>
        <InlineMessage message={errors.form ?? null} />
      </div>

      {edit && (
        <div className="card-surface edge flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-fg text-sm">Delete this trade</span>
            <span className="text-fg-subtle text-xs">
              Removes the entry with its accounts, tags, links and screenshots.
              This cannot be undone.
            </span>
          </div>
          <button
            type="button"
            disabled={loading || success}
            onClick={handleDeleteClick}
            className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-ctl border text-sm transition-colors duration-200 disabled:opacity-60 ${
              confirmingDelete
                ? "border-danger-fg/60 bg-danger/15 text-danger-fg"
                : "border-white/12 text-fg-muted hover:border-danger-fg/45 hover:text-danger-fg"
            }`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {confirmingDelete ? "Click again to confirm" : "Delete trade"}
          </button>
        </div>
      )}
    </form>
  );
}
