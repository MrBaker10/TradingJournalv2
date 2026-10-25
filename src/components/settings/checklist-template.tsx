"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  addChecklistStep,
  deleteChecklistStep,
  moveChecklistStep,
  renameChecklistStep,
} from "@/actions/checklist";
import { FIELD_CLASS } from "@/components/ui/field-class";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { notifyError } from "@/components/ui/toast";
import type { ChecklistItem } from "@/db/queries/checklist";
import {
  CHECKLIST_MOVE_FAILED,
  CHECKLIST_PHASE_FULL,
  CHECKLIST_PHASE_LABELS,
  CHECKLIST_PHASES,
  CHECKLIST_SAVE_FAILED,
  type ChecklistItemInput,
  type ChecklistMoveDirection,
  checklistItemSchema,
  MAX_CHECKLIST_ITEMS_PER_PHASE,
} from "@/schemas/checklist";

const BUTTON_CLASS =
  "h-11 shrink-0 rounded-ctl border border-white/12 bg-white/5 px-3 text-sm text-fg transition-colors hover:border-cyan/35 focus-visible:outline-cyan disabled:opacity-40";

type Phase = ChecklistItemInput["phase"];

export function ChecklistTemplate({ items }: { items: ChecklistItem[] }) {
  return (
    <section
      aria-labelledby="checklist-template-heading"
      className="flex max-w-4xl flex-col gap-3"
    >
      <h2 id="checklist-template-heading" className="cap">
        Checklist template
      </h2>
      <div className="card-surface edge divide-y divide-white/8">
        <p className="p-5 text-sm text-fg-muted">
          Your routine, in three phases. Up to 20 steps per phase, 120
          characters per step.
        </p>
        {CHECKLIST_PHASES.map((phase) => (
          <ChecklistPhase
            key={phase}
            phase={phase}
            items={items.filter((item) => item.phase === phase)}
          />
        ))}
      </div>
    </section>
  );
}

function ChecklistPhase({
  phase,
  items,
}: {
  phase: Phase;
  items: ChecklistItem[];
}) {
  const addInput = useRef<HTMLInputElement>(null);
  return (
    <section aria-labelledby={`checklist-${phase}`} className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 id={`checklist-${phase}`} className="text-sm font-medium text-fg">
          {CHECKLIST_PHASE_LABELS[phase]}
        </h3>
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          {items.length}/20
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mb-4 text-sm text-fg-subtle">
          No steps yet. Add your first step below.
        </p>
      ) : (
        <ol className="mb-4 space-y-3">
          {items.map((item, index) => (
            <ChecklistRow
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onDeleted={() => addInput.current?.focus()}
            />
          ))}
        </ol>
      )}
      <StepForm
        phase={phase}
        full={items.length >= MAX_CHECKLIST_ITEMS_PER_PHASE}
        inputRef={addInput}
      />
    </section>
  );
}

function ChecklistRow({
  item,
  isFirst,
  isLast,
  onDeleted,
}: {
  item: ChecklistItem;
  isFirst: boolean;
  isLast: boolean;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const renameButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);

  function closeEdit() {
    setEditing(false);
    requestAnimationFrame(() => renameButton.current?.focus());
  }

  function remove() {
    startTransition(async () => {
      try {
        const result = await deleteChecklistStep({ itemId: item.id });
        if (!result.success) {
          notifyError(result.error);
          return;
        }
        onDeleted();
      } catch {
        notifyError("Couldn't delete the step. Try again.");
      }
    });
  }

  return (
    <li className="rounded-ctl border border-white/8 bg-well/50 p-3">
      {editing ? (
        <StepForm phase={item.phase} item={item} onClose={closeEdit} />
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 break-words text-sm text-fg">
            {item.text}
          </span>
          <div className="flex shrink-0 flex-wrap gap-2">
            {confirming ? (
              <>
                <span className="flex items-center text-xs text-fg-muted">
                  Delete this step?
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={remove}
                  className={BUTTON_CLASS}
                >
                  <span className="grid">
                    <span
                      className={`col-start-1 row-start-1 ${pending ? "invisible" : ""}`}
                    >
                      Confirm delete
                    </span>
                    <span
                      aria-hidden={!pending}
                      className={`col-start-1 row-start-1 ${pending ? "" : "invisible"}`}
                    >
                      Deleting…
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setConfirming(false);
                    requestAnimationFrame(() => deleteButton.current?.focus());
                  }}
                  className={BUTTON_CLASS}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <MoveControls item={item} isFirst={isFirst} isLast={isLast} />
                <button
                  ref={renameButton}
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label={`Rename ${item.text}`}
                  className={BUTTON_CLASS}
                >
                  Rename
                </button>
                <button
                  ref={deleteButton}
                  type="button"
                  onClick={() => setConfirming(true)}
                  aria-label={`Delete ${item.text}`}
                  className={BUTTON_CLASS}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

const MOVE_DIRECTIONS = [
  { direction: "up", Icon: ChevronUp },
  { direction: "down", Icon: ChevronDown },
] as const;

function MoveControls({
  item,
  isFirst,
  isLast,
}: {
  item: ChecklistItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [moving, startMove] = useTransition();
  const [pressed, setPressed] = useState<ChecklistMoveDirection | null>(null);
  const buttons = useRef<
    Record<ChecklistMoveDirection, HTMLButtonElement | null>
  >({ up: null, down: null });
  const refocus = useRef(false);

  // Reordering moves DOM nodes, which can drop focus. Once the new order has
  // rendered, put focus back on the pressed arrow, or on the other one when
  // the row has reached an edge — unless the user has moved focus elsewhere.
  useEffect(() => {
    if (moving || !refocus.current || !pressed) return;
    refocus.current = false;
    const active = document.activeElement;
    if (
      active &&
      active !== document.body &&
      !Object.values(buttons.current).includes(active as HTMLButtonElement)
    )
      return;
    const target = buttons.current[pressed];
    const other = buttons.current[pressed === "up" ? "down" : "up"];
    (target?.disabled ? other : target)?.focus();
  }, [moving, pressed]);

  // A pending move is guarded here rather than by disabling the arrows, so
  // the pressed button keeps focus while the move is saved.
  function move(direction: ChecklistMoveDirection) {
    if (moving) return;
    setPressed(direction);
    startMove(async () => {
      try {
        const result = await moveChecklistStep({ itemId: item.id, direction });
        if (!result.success) {
          notifyError(result.error);
          return;
        }
        refocus.current = true;
      } catch {
        notifyError(CHECKLIST_MOVE_FAILED);
      }
    });
  }

  return MOVE_DIRECTIONS.map(({ direction, Icon }) => (
    <button
      key={direction}
      ref={(button) => {
        buttons.current[direction] = button;
      }}
      type="button"
      disabled={direction === "up" ? isFirst : isLast}
      aria-busy={moving && pressed === direction}
      onClick={() => move(direction)}
      aria-label={`Move ${item.text} ${direction}`}
      className={BUTTON_CLASS}
    >
      {moving && pressed === direction ? (
        <PendingIndicator label="Moving…" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  ));
}

function StepForm({
  phase,
  item,
  full = false,
  onClose,
  inputRef,
}: {
  phase: Phase;
  item?: ChecklistItem;
  full?: boolean;
  onClose?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const [text, setText] = useState(item?.text ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (item) ref.current?.focus();
  }, [item, ref]);

  function save() {
    if (pending) return;
    const parsed = checklistItemSchema.safeParse({ phase, text });
    if (!parsed.success || full) {
      setError(
        !parsed.success ? parsed.error.issues[0].message : CHECKLIST_PHASE_FULL,
      );
      ref.current?.focus();
      return;
    }
    startTransition(async () => {
      try {
        const result = item
          ? await renameChecklistStep({
              itemId: item.id,
              text: parsed.data.text,
            })
          : await addChecklistStep(parsed.data);
        if (!result.success) {
          if (result.field) {
            setError(result.error);
            ref.current?.focus();
          } else notifyError(result.error);
          return;
        }
        setError("");
        if (item) onClose?.();
        else {
          setText("");
          ref.current?.focus();
        }
      } catch {
        notifyError(CHECKLIST_SAVE_FAILED);
      }
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <label htmlFor={id} className="mb-2 block text-xs text-fg-muted">
        {item
          ? "Step text"
          : `New ${CHECKLIST_PHASE_LABELS[phase].toLowerCase()} step`}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          ref={ref}
          id={id}
          value={text}
          readOnly={pending}
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={`${id}-error`}
          onChange={(event) => {
            setText(event.target.value);
            const parsed = checklistItemSchema.shape.text.safeParse(
              event.target.value,
            );
            setError(parsed.success ? "" : parsed.error.issues[0].message);
          }}
          className={`${FIELD_CLASS} flex-1 basis-48`}
        />
        <button type="submit" disabled={pending} className={BUTTON_CLASS}>
          <span className="grid">
            <span
              className={`col-start-1 row-start-1 ${pending ? "invisible" : ""}`}
            >
              {item ? "Save step" : "Add step"}
            </span>
            <span
              aria-hidden={!pending}
              className={`col-start-1 row-start-1 ${pending ? "" : "invisible"}`}
            >
              Saving…
            </span>
          </span>
        </button>
        {item && (
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className={BUTTON_CLASS}
          >
            Cancel
          </button>
        )}
      </div>
      <p
        id={`${id}-error`}
        aria-live="polite"
        className="mt-1 min-h-[18px] text-xs text-danger-fg"
      >
        {error || (full ? CHECKLIST_PHASE_FULL : "")}
      </p>
    </form>
  );
}
