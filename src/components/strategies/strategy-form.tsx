"use client";

import { useId, useRef, useState, useTransition } from "react";
import { addStrategy, editStrategy } from "@/actions/strategies";
import {
  FieldError,
  FieldLabel,
  TextField,
} from "@/components/trades/form-blocks";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { runWithToast } from "@/components/ui/toast";
import type { Strategy } from "@/db/queries/strategies";
import {
  MAX_STRATEGY_CHAPTER_LENGTH,
  MAX_STRATEGY_NAME_LENGTH,
  STRATEGY_SAVE_FAILED,
  strategyContentSchema,
} from "@/schemas/strategies";
import { type ChapterKey, STRATEGY_CHAPTERS } from "./strategy-chapters";

type Draft = Record<"name" | ChapterKey, string>;

function draftOf(strategy: Strategy | null): Draft {
  return {
    name: strategy?.name ?? "",
    prerequisites: strategy?.prerequisites ?? "",
    entry: strategy?.entry ?? "",
    stopRisk: strategy?.stopRisk ?? "",
    exit: strategy?.exit ?? "",
    exclusions: strategy?.exclusions ?? "",
  };
}

/**
 * The strategy's name and five chapters as the form blocks of Design.md §3.5,
 * on one page inside the sheet. The name is the only requirement: a strategy
 * can start as a name and grow its chapters later. Saving an edit records a
 * new revision (docs/adr/0003); the sheet then confirms the action.
 */
export function StrategyForm({
  strategy,
  onCancel,
  onSaved,
}: {
  /** The strategy to edit; null for a new one. */
  strategy: Strategy | null;
  onCancel: () => void;
  onSaved: (name: string) => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<Draft>(() => draftOf(strategy));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function change(values: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...values }));
    setErrors({});
  }

  function save() {
    if (isPending) return;
    const parsed = strategyContentSchema.safeParse(draft);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    startTransition(async () => {
      const saved = await runWithToast(
        () =>
          strategy
            ? editStrategy({ ...draft, strategyId: strategy.id })
            : addStrategy(draft),
        { failed: STRATEGY_SAVE_FAILED },
      );
      if (saved) onSaved(parsed.data.name);
    });
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex min-h-10 flex-col gap-1 pr-10">
        <SheetTitle className="font-semibold text-lg">
          {strategy ? "Edit strategy" : "New strategy"}
        </SheetTitle>
        <SheetDescription>
          {strategy
            ? "Trades already assigned keep the rules they were assigned."
            : "Start with a name; write the rules down when you are ready."}
        </SheetDescription>
      </div>

      <div className="flex flex-col gap-4">
        <TextField
          id={`${id}-name`}
          label="Name"
          required
          value={draft.name}
          onChange={(name) => change({ name })}
          placeholder="e.g. Opening range break"
          maxLength={MAX_STRATEGY_NAME_LENGTH}
          error={errors.name}
          disabled={isPending}
        />
        {STRATEGY_CHAPTERS.map((chapter) => (
          <div key={chapter.key} className="flex flex-col gap-1">
            <FieldLabel htmlFor={`${id}-${chapter.key}`}>
              {chapter.label} (optional)
            </FieldLabel>
            <Textarea
              id={`${id}-${chapter.key}`}
              rows={3}
              maxLength={MAX_STRATEGY_CHAPTER_LENGTH}
              value={draft[chapter.key]}
              placeholder={chapter.placeholder}
              disabled={isPending}
              aria-invalid={errors[chapter.key] ? true : undefined}
              aria-describedby={
                errors[chapter.key] ? `${id}-${chapter.key}-error` : undefined
              }
              onChange={(event) =>
                change({ [chapter.key]: event.target.value })
              }
              className="min-h-20"
            />
            <FieldError
              id={`${id}-${chapter.key}-error`}
              message={errors[chapter.key]}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          className="h-10 min-w-32 px-4"
          disabled={isPending}
        >
          {isPending ? (
            <PendingIndicator label="Saving…" />
          ) : strategy ? (
            "Save strategy"
          ) : (
            "Add strategy"
          )}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          className="h-10 px-4"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
