"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentType, useRef, useState, useTransition } from "react";
import {
  addTradeLink,
  createTrade,
  deleteTrade,
  deleteTradeLink,
  deleteTradeScreenshot,
  updateTrade,
} from "@/actions/trades";
import {
  ScreenshotTiles,
  type TradeLinkItem,
  TradeLinks,
} from "@/components/trades/evidence-fields";
import { DrawnCheck, PICK_SPRING } from "@/components/trades/form-blocks";
import {
  StepExecution,
  type StepProps,
  StepReflect,
  StepWhat,
  StepWhy,
  type TradeFormData,
} from "@/components/trades/trade-form-steps";
import { Button, buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { notifyError } from "@/components/ui/toast";
import type { JournalTradeRow } from "@/db/queries/trades";
import { MAX_SCREENSHOTS_PER_TRADE } from "@/domain/trades";
import { usePasteImages } from "@/hooks/use-paste-images";
import { useTwoClickConfirm } from "@/hooks/use-two-click-confirm";
import { Link, useRouter } from "@/lib/i18n/navigation";
import {
  EMPTY_TRADE_FORM,
  EVIDENCE_STEP,
  firstBlockedStep,
  formStateFromTrade,
  isStepDone,
  LOG_NOW_FROM_STEP,
  missingInStep,
  REQUIRED_STEPS,
  stepEcho,
  stepOfField,
  type TradeFormState,
  tradePayload,
  unreadableInStep,
} from "@/lib/trades/form-steps";
import { resizeAndCompressImage } from "@/lib/uploads/resize-image";
import { cn } from "@/lib/utils";
import { createTradeSchema } from "@/schemas/trades";

interface StagedScreenshot {
  id: string;
  blob: Blob;
  url: string;
}

const STEPS: { title: string; question: string }[] = [
  { title: "What", question: "What did you trade?" },
  { title: "Execution", question: "How did it run?" },
  { title: "Why", question: "Why did you take it?" },
  { title: "Reflect", question: "How did you handle it?" },
  { title: "Evidence", question: "Anything to look back at?" },
];

const STEP_BODIES: ComponentType<StepProps>[] = [
  StepWhat,
  StepExecution,
  StepWhy,
  StepReflect,
];

/**
 * One form for both jobs, walked in five steps (Design.md §3.5). The fields,
 * their validation and the live P&L are the same whether a trade is written
 * for the first time or corrected later.
 *
 * What differs is attachments. A new trade has no id yet, so screenshots are
 * staged as blobs and uploaded after the insert, and links ride along in the
 * payload. An existing trade already has an id, so both go to the server the
 * moment they are added.
 */
type TradeFormProps = TradeFormData &
  ({ mode: "create" } | { mode: "edit"; trade: JournalTradeRow });

export function TradeForm(props: TradeFormProps) {
  // Narrowed once so the callbacks below can read it without re-checking.
  const edit = props.mode === "edit" ? props : null;
  const router = useRouter();

  const [state, setState] = useState<TradeFormState>(
    edit ? formStateFromTrade(edit.trade) : EMPTY_TRADE_FORM,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [[step, travel], setStepState] = useState<[number, number]>([0, 1]);
  // Steps the trader tried to leave with a required field empty: only those
  // name what is missing, so an untouched step is not red from the start.
  const [tried, setTried] = useState<ReadonlySet<number>>(new Set());
  const [shake, setShake] = useState(0);
  const [saved, setSaved] = useState<{ taken: boolean; note: string | null }>();
  const [isPending, startTransition] = useTransition();
  const [attaching, setAttaching] = useState(false);
  const [stagedLinks, setStagedLinks] = useState<TradeLinkItem[]>([]);
  const [stagedScreenshots, setStagedScreenshots] = useState<
    StagedScreenshot[]
  >([]);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const deleteConfirm = useTwoClickConfirm();
  // Focus moves to the new step's question, but not on first load.
  const focusQuestion = useRef(false);
  // Reduced motion: the step fades in place instead of sliding 28 px.
  const slide = useReducedMotion() ? 0 : 28;

  // In edit mode the server holds both lists; in create mode the staged ones.
  const screenshots = edit ? edit.trade.screenshots : stagedScreenshots;
  const links = edit ? edit.trade.links : stagedLinks;
  const disabled = isPending;

  const instrument = props.instruments.find(
    (candidate) => candidate.id === Number(state.instrumentId),
  );
  const attached = {
    instrumentSymbol: instrument?.symbol,
    screenshots: screenshots.length,
    links: links.length,
  };
  const echo = stepEcho(state, attached);
  const last = step === STEPS.length - 1;

  usePasteImages(
    step === EVIDENCE_STEP && !saved && props.screenshotUploads,
    addScreenshots,
  );

  function update(patch: Partial<TradeFormState>) {
    setState((prev) => ({ ...prev, ...patch }));
    const cleared = Object.keys(patch).filter((key) => errors[key]);
    if (cleared.length > 0) {
      setErrors((prev) => {
        const next = { ...prev };
        for (const key of cleared) delete next[key];
        return next;
      });
    }
  }

  function go(next: number) {
    focusQuestion.current = true;
    setStepState([next, next >= step ? 1 : -1]);
  }

  function block(index: number) {
    setTried((prev) => new Set(prev).add(index));
    setShake((value) => value + 1);
  }

  function next() {
    if (missingInStep(state, step).length > 0) return block(step);
    // Typed text that is no number stops here too, with the schema's message
    // at its field, instead of only when the trade is saved.
    const unreadable = unreadableInStep(state, step);
    if (unreadable.length > 0) {
      const messages = schemaErrors(parsePayload());
      setErrors((prev) => ({
        ...prev,
        ...Object.fromEntries(
          unreadable.flatMap((field) =>
            messages[field] ? [[field, messages[field]]] : [],
          ),
        ),
      }));
      return block(step);
    }
    if (last) save();
    else go(step + 1);
  }

  function parsePayload() {
    return createTradeSchema.safeParse(
      tradePayload(
        state,
        edit
          ? []
          : stagedLinks.map((link) => ({
              url: link.url,
              label: link.label ?? undefined,
            })),
      ),
    );
  }

  /** The schema's first message per field; empty when the payload passes. */
  function schemaErrors(
    parsed: ReturnType<typeof parsePayload>,
  ): Record<string, string> {
    const fieldErrors: Record<string, string> = {};
    if (parsed.success) return fieldErrors;
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fieldErrors;
  }

  /** "Log now" and ⌘↵: save from any step once steps one and two hold. */
  function save() {
    const blocked = firstBlockedStep(state);
    if (blocked !== undefined) {
      if (blocked !== step) go(blocked);
      return block(blocked);
    }

    const parsed = parsePayload();
    if (!parsed.success) {
      const fieldErrors = schemaErrors(parsed);
      setErrors(fieldErrors);
      // The error lands at its field, so open the first step that holds one.
      const steps = Object.keys(fieldErrors)
        .map(stepOfField)
        .filter((index) => index !== undefined);
      if (steps.length > 0) {
        const target = Math.min(...steps);
        if (target !== step) go(target);
      }
      setShake((value) => value + 1);
      return;
    }

    startTransition(async () => {
      if (edit) {
        const result = await updateTrade({
          tradeId: edit.trade.id,
          trade: parsed.data,
        });
        if (!result.success) return notifyError(result.error);
        setErrors({});
        setSaved({ taken: state.taken, note: null });
        return;
      }

      const result = await createTrade(parsed.data);
      if (!result.success) return notifyError(result.error);

      // Screenshots can only be uploaded once the trade exists.
      let note: string | null = null;
      for (const screenshot of stagedScreenshots) {
        const error = await uploadScreenshot(result.data.id, screenshot.blob);
        if (error) note = "A screenshot failed to upload; add it on the trade.";
      }
      setErrors({});
      setSaved({ taken: state.taken, note });
    });
  }

  function logAnother() {
    for (const screenshot of stagedScreenshots) {
      URL.revokeObjectURL(screenshot.url);
    }
    setStagedScreenshots([]);
    setStagedLinks([]);
    setState(EMPTY_TRADE_FORM);
    setTried(new Set());
    setErrors({});
    setSaved(undefined);
    focusQuestion.current = true;
    setStepState([0, -1]);
  }

  // The upload endpoint is a route handler, not a Server Action, so
  // router.refresh() re-runs the page to pick the new screenshot up.
  async function uploadScreenshot(tradeId: number, blob: Blob) {
    const formData = new FormData();
    formData.append("tradeId", String(tradeId));
    formData.append("file", blob, "screenshot.jpg");
    let response: Response;
    try {
      response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
    } catch {
      return "Could not upload that screenshot. Check the connection.";
    }
    if (response.ok) return null;
    const body: { error?: string } | null = await response
      .json()
      .catch(() => null);
    return body?.error ?? "Could not upload that screenshot.";
  }

  /** Dropped, picked or pasted images go into the next free slots. */
  async function addScreenshots(files: File[]) {
    const free = MAX_SCREENSHOTS_PER_TRADE - screenshots.length;
    if (free <= 0) {
      setScreenshotError(
        `A trade can have at most ${MAX_SCREENSHOTS_PER_TRADE} screenshots.`,
      );
      return;
    }
    const images = files.filter((file) => file.type.startsWith("image/"));
    setAttaching(true);
    let error: string | null =
      images.length > free
        ? `Only ${free} more screenshot${free === 1 ? "" : "s"} fit.`
        : null;
    for (const file of images.slice(0, free)) {
      let blob: Blob;
      try {
        blob = await resizeAndCompressImage(file);
      } catch {
        error = "Could not process that image.";
        continue;
      }
      if (edit) {
        error = (await uploadScreenshot(edit.trade.id, blob)) ?? error;
      } else {
        setStagedScreenshots((prev) => [
          ...prev,
          { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) },
        ]);
      }
    }
    setAttaching(false);
    setScreenshotError(error);
    if (edit) router.refresh();
  }

  async function removeScreenshot(id: string | number) {
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

  async function addLink(input: { url: string; label?: string }) {
    if (edit) {
      const result = await addTradeLink({ tradeId: edit.trade.id, ...input });
      setLinkError(result.success ? null : result.error);
      if (result.success) router.refresh();
      return;
    }
    setStagedLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), url: input.url, label: input.label ?? null },
    ]);
  }

  async function removeLink(id: string | number) {
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

  function handleDelete() {
    if (!edit) return;
    deleteConfirm.press(() =>
      startTransition(async () => {
        const result = await deleteTrade({ tradeId: edit.trade.id });
        if (!result.success) return notifyError(result.error);
        router.push("/journal");
        router.refresh();
      }),
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    // A field that handles Enter itself (the link input) has said so.
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      save();
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    // Enter is a newline in a textarea and a click on a button or link.
    if (target.closest("textarea, button, a, select, summary")) return;
    event.preventDefault();
    next();
  }

  if (saved) {
    return (
      <SavedState
        title={
          edit
            ? "Trade saved"
            : saved.taken
              ? "Trade logged"
              : "Missed setup logged"
        }
        subtitle={[state.tradeDate, instrument?.symbol]
          .filter(Boolean)
          .join(" · ")}
        note={saved.note}
        tradeId={edit?.trade.id}
        onLogAnother={edit ? undefined : logAnother}
      />
    );
  }

  const Body = STEP_BODIES[step];
  const stillNeeded = tried.has(step) ? missingInStep(state, step) : [];
  // A save the schema refused names nothing missing, but its errors sit at
  // fields of this step: the same line says so and shakes.
  const stepErrors = Object.keys(errors).filter(
    (key) => errors[key] && stepOfField(key) === step,
  ).length;
  const blockedMessage =
    stillNeeded.length > 0
      ? `Still needed: ${stillNeeded.join(", ")}`
      : stepErrors > 0
        ? `Check the marked field${stepErrors === 1 ? "" : "s"}.`
        : null;
  const stepProps: StepProps = {
    data: props,
    state,
    update,
    errors,
    isMissing: (name) => stillNeeded.includes(name),
    editTrade: edit?.trade ?? null,
    disabled,
  };
  const showLogNow = step >= LOG_NOW_FROM_STEP && !last;
  const submitLabel = edit
    ? "Save changes"
    : state.taken
      ? "Log trade"
      : "Log missed setup";

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10">
        <StepRail
          step={step}
          echo={echo}
          done={(index) => index !== step && isStepDone(state, index, attached)}
          onGo={go}
        />

        {/* noValidate: the Zod schema is the one validator; `required` only
            marks the fields for assistive tech. */}
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            next();
          }}
          onKeyDown={handleKeyDown}
          className="flex min-w-0 flex-col gap-8"
        >
          <Progress
            value={((step + 1) / STEPS.length) * 100}
            aria-label={`Step ${step + 1} of ${STEPS.length}`}
            className="flex-col gap-2 [&_[data-slot=progress-indicator]]:bg-process [&_[data-slot=progress-indicator]]:duration-200 [&_[data-slot=progress-indicator]]:ease-out"
          >
            <span className="text-muted-foreground text-xs">
              Step {step + 1} of {STEPS.length}
            </span>
          </Progress>

          <AnimatePresence mode="wait" custom={travel} initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: travel * slide }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: travel * -slide }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-7"
            >
              <h2
                tabIndex={-1}
                ref={(heading) => {
                  if (heading && focusQuestion.current) {
                    focusQuestion.current = false;
                    heading.focus({ preventScroll: true });
                  }
                }}
                className="font-semibold text-2xl tracking-tight outline-none"
              >
                {STEPS[step].question}
              </h2>
              {Body ? (
                <Body {...stepProps} />
              ) : (
                <div className="flex flex-col gap-6">
                  <ScreenshotTiles
                    screenshots={screenshots}
                    pending={attaching}
                    disabled={disabled}
                    uploads={props.screenshotUploads}
                    error={screenshotError}
                    onAdd={addScreenshots}
                    onRemove={removeScreenshot}
                  />
                  <TradeLinks
                    links={links}
                    disabled={disabled}
                    error={linkError ?? errors.links ?? null}
                    onAdd={addLink}
                    onRemove={removeLink}
                  />
                  {edit && (
                    <p className="text-muted-foreground text-xs">
                      Screenshots and links are saved the moment you add or
                      remove them.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {blockedMessage && (
            <motion.p
              key={shake}
              role="alert"
              initial={{ x: 0 }}
              animate={{ x: [0, -7, 7, -4, 4, 0] }}
              transition={{ duration: 0.35 }}
              className="text-negative text-sm"
            >
              {blockedMessage}
            </motion.p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-border border-t pt-5">
            {step > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="h-10"
                disabled={disabled}
                onClick={() => go(step - 1)}
              >
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            )}
            {showLogNow && (
              <Button
                variant="ghost"
                size="lg"
                className="ml-auto h-10 text-muted-foreground"
                disabled={disabled}
                onClick={save}
              >
                {edit ? "Save now" : "Log now"}
                <Kbd>⌘↵</Kbd>
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={disabled}
              className={cn("group h-10 px-4", !showLogNow && "ml-auto")}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : last ? (
                submitLabel
              ) : (
                <>
                  Next
                  <ArrowRight
                    className="transition-[translate] duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {edit && (
        <section className="flex flex-col gap-3 border-border border-t pt-6 md:ml-[240px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">Delete this trade</span>
            <span className="text-muted-foreground text-xs">
              Removes the entry with its accounts, tags, links and screenshots.
              This cannot be undone.
            </span>
          </div>
          <Button
            variant="destructive"
            size="lg"
            className="h-10 w-fit"
            disabled={disabled}
            onClick={handleDelete}
          >
            <Trash2 aria-hidden="true" />
            {deleteConfirm.armed ? "Click again to confirm" : "Delete trade"}
          </Button>
        </section>
      )}
    </div>
  );
}

/** The rail beside the steps: each step's answers so far, a check when done. */
function StepRail({
  step,
  echo,
  done,
  onGo,
}: {
  step: number;
  echo: string[];
  done: (index: number) => boolean;
  onGo: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Steps"
      className="grid grid-cols-5 gap-1 md:sticky md:top-6 md:flex md:flex-col md:gap-0.5 md:self-start"
    >
      {STEPS.map((item, index) => {
        const current = index === step;
        const finished = done(index);
        return (
          <button
            key={item.title}
            type="button"
            aria-current={current ? "step" : undefined}
            onClick={() => onGo(index)}
            className="relative flex min-h-10 flex-col items-center gap-1 rounded-lg px-1 py-2 text-center outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 md:flex-row md:items-start md:gap-3 md:px-2 md:text-left"
          >
            {current && (
              <motion.span
                layoutId="trade-form-rail"
                transition={PICK_SPRING}
                className="absolute inset-0 rounded-lg bg-muted"
              />
            )}
            <span
              className={cn(
                "relative flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] transition-colors duration-150 md:mt-0.5",
                finished
                  ? "border-process bg-process text-background"
                  : current
                    ? "border-foreground text-foreground"
                    : "border-input text-muted-foreground",
              )}
            >
              {finished ? (
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span className="relative flex min-w-0 max-w-full flex-col">
              <span
                className={cn(
                  "truncate text-xs md:text-sm",
                  current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.title}
                {/* Required fields live in steps one and two only. */}
                {REQUIRED_STEPS.some((required) => required === index) && (
                  <span className="ml-0.5 text-process" aria-hidden="true">
                    *
                  </span>
                )}
              </span>
              {echo[index] && (
                <span className="hidden truncate text-[11px] text-muted-foreground md:block">
                  {echo[index]}
                </span>
              )}
              {finished && <span className="sr-only">, done</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Confirms the action, never the result: no P&L, no R (Design.md §3.11). */
function SavedState({
  title,
  subtitle,
  note,
  tradeId,
  onLogAnother,
}: {
  title: string;
  subtitle: string;
  note: string | null;
  tradeId: number | undefined;
  onLogAnother: (() => void) | undefined;
}) {
  return (
    <div
      role="status"
      className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center md:py-24"
    >
      <DrawnCheck />
      <h2 className="font-semibold text-xl tracking-tight">{title}</h2>
      {subtitle && (
        <p className="font-mono text-muted-foreground text-sm tabular-nums">
          {subtitle}
        </p>
      )}
      {note && <p className="text-negative text-sm">{note}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {onLogAnother && (
          <Button size="lg" className="h-10 px-4" onClick={onLogAnother}>
            Log another
          </Button>
        )}
        {tradeId !== undefined && (
          <Link
            href={`/journal/${tradeId}`}
            className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}
          >
            Back to trade
          </Link>
        )}
        <Link
          href="/journal"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 px-4",
          )}
        >
          View in journal
        </Link>
      </div>
    </div>
  );
}
