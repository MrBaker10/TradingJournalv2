"use client";

import { useId, useRef, useState, useTransition } from "react";
import { addStrategy, editStrategy } from "@/actions/strategies";
import {
  runWithToast,
  SaveButton,
} from "@/components/ledger/ledger-entry-fields";
import { FIELD_CLASS } from "@/components/ui/field-class";
import type { StrategyContent } from "@/db/queries/strategies";
import {
  MAX_STRATEGY_CHAPTER_LENGTH,
  MAX_STRATEGY_NAME_LENGTH,
  STRATEGY_SAVE_FAILED,
  strategyContentSchema,
} from "@/schemas/strategies";
import { type ChapterKey, STRATEGY_CHAPTERS } from "./strategy-chapters";

interface StrategyFormProps {
  /** The rules to start from; null for a new strategy. */
  initial: StrategyContent | null;
  /** Set when editing: saving then records a new revision of this strategy. */
  strategyId?: number;
  onClose: () => void;
}

type Draft = Record<"name" | ChapterKey, string>;

const TEXTAREA_CLASS = `${FIELD_CLASS} h-auto resize-y py-2`;

function draftOf(initial: StrategyContent | null): Draft {
  return {
    name: initial?.name ?? "",
    prerequisites: initial?.prerequisites ?? "",
    entry: initial?.entry ?? "",
    stopRisk: initial?.stopRisk ?? "",
    exit: initial?.exit ?? "",
    exclusions: initial?.exclusions ?? "",
  };
}

// Saving is explicit and closes the form. The name is the only requirement:
// a strategy can start as a name and grow its chapters later.
export function StrategyForm({
  initial,
  strategyId,
  onClose,
}: StrategyFormProps) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const editing = strategyId !== undefined;

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
          editing ? editStrategy({ ...draft, strategyId }) : addStrategy(draft),
        {
          success: editing ? "Strategy saved" : "Strategy created",
          failed: STRATEGY_SAVE_FAILED,
        },
      );
      if (saved) onClose();
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
      className="flex flex-col gap-4"
      aria-label={editing ? "Edit strategy" : "New strategy"}
    >
      <fieldset
        disabled={isPending}
        className="flex min-w-0 flex-col gap-4 disabled:opacity-60"
      >
        <div>
          <label htmlFor={`${id}-name`} className="mb-2 block text-fg text-sm">
            Name
          </label>
          <input
            id={`${id}-name`}
            autoComplete="off"
            maxLength={MAX_STRATEGY_NAME_LENGTH}
            value={draft.name}
            onChange={(event) => change({ name: event.target.value })}
            placeholder="e.g. Opening range break"
            className={FIELD_CLASS}
            aria-invalid={!!errors.name}
            aria-describedby={`${id}-name-error`}
          />
          <p
            id={`${id}-name-error`}
            className="mt-1 min-h-[18px] text-danger-fg text-xs"
          >
            {errors.name}
          </p>
        </div>
        {STRATEGY_CHAPTERS.map((chapter) => (
          <div key={chapter.key}>
            <label
              htmlFor={`${id}-${chapter.key}`}
              className="mb-2 block text-fg text-sm"
            >
              {chapter.label} <span className="text-fg-subtle">(optional)</span>
            </label>
            <textarea
              id={`${id}-${chapter.key}`}
              rows={4}
              maxLength={MAX_STRATEGY_CHAPTER_LENGTH}
              value={draft[chapter.key]}
              onChange={(event) =>
                change({ [chapter.key]: event.target.value })
              }
              placeholder={chapter.placeholder}
              className={TEXTAREA_CLASS}
              aria-invalid={!!errors[chapter.key]}
              aria-describedby={`${id}-${chapter.key}-error`}
            />
            <p
              id={`${id}-${chapter.key}-error`}
              className="mt-1 min-h-[18px] text-danger-fg text-xs"
            >
              {errors[chapter.key]}
            </p>
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <SaveButton
          pending={isPending}
          label={editing ? "Save changes" : "Create strategy"}
        />
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          className="flex h-11 items-center justify-center rounded-ctl px-4 text-fg-muted text-sm transition-colors hover:text-fg disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
