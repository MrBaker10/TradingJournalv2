"use client";

import { ArrowDown, ArrowUp, Pencil, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  addChecklistStep,
  deleteChecklistStep,
  moveChecklistStep,
  renameChecklistStep,
} from "@/actions/checklist";
import { FieldError } from "@/components/trades/form-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { notifyError, notifyProcess } from "@/components/ui/toast";
import type { ChecklistItem } from "@/db/queries/checklist";
import { useMessage } from "@/hooks/use-message";
import { useTwoClickConfirm } from "@/hooks/use-two-click-confirm";
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

type Phase = ChecklistItemInput["phase"];

// A step's tools show on hover and on keyboard focus; on a touch screen,
// which has no hover, they are always there (Design.md §3.8). A disabled
// arrow hides at rest too, or the button's own disabled opacity shows it.
const ROW_TOOL =
  "size-10 text-muted-foreground lg:size-7 lg:opacity-0 lg:disabled:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100 lg:group-focus-within:disabled:opacity-40 lg:group-hover:disabled:opacity-40 [@media(hover:none)]:opacity-100";

/** The checklist template of Design.md §3.8: three phases side by side. */
export function ChecklistTemplate({ items }: { items: ChecklistItem[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {CHECKLIST_PHASES.map((phase) => (
        <ChecklistPhase
          key={phase}
          phase={phase}
          items={items.filter((item) => item.phase === phase)}
        />
      ))}
    </div>
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
    <section
      aria-labelledby={`checklist-${phase}`}
      className="flex min-w-0 flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`checklist-${phase}`} className="text-muted-foreground text-xs">
          {CHECKLIST_PHASE_LABELS[phase]}
        </h3>
        <span className="font-mono text-muted-foreground text-xs tabular-nums">
          {items.length}/{MAX_CHECKLIST_ITEMS_PER_PHASE}
        </span>
      </div>
      {items.length > 0 && (
        <ol className="flex flex-col gap-1.5">
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
  const [pending, startTransition] = useTransition();
  const message = useMessage();
  const removeConfirm = useTwoClickConfirm();
  const renameButton = useRef<HTMLButtonElement>(null);

  function closeEdit() {
    setEditing(false);
    requestAnimationFrame(() => renameButton.current?.focus());
  }

  function remove() {
    startTransition(async () => {
      try {
        const result = await deleteChecklistStep({ itemId: item.id });
        if (!result.success) {
          notifyError(message(result.error));
          return;
        }
        notifyProcess("Step removed");
        onDeleted();
      } catch {
        notifyError("Couldn't delete the step. Try again.");
      }
    });
  }

  if (editing)
    return (
      <li>
        <StepForm phase={item.phase} item={item} onClose={closeEdit} />
      </li>
    );

  return (
    <li className="group flex items-center gap-1 rounded-lg border py-1 pr-1 pl-3 text-sm transition-colors duration-150 hover:bg-accent">
      <span className="min-w-0 flex-1 break-words py-1">{item.text}</span>
      {removeConfirm.armed ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => removeConfirm.press(remove)}
          className="h-10 border-negative/50 text-negative hover:text-negative lg:h-7"
        >
          {pending ? <PendingIndicator label="Removing…" /> : "Remove?"}
        </Button>
      ) : (
        <>
          <MoveControls item={item} isFirst={isFirst} isLast={isLast} />
          <Button
            ref={renameButton}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${item.text}`}
            className={ROW_TOOL}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeConfirm.press(remove)}
            aria-label={`Remove ${item.text}`}
            className={`${ROW_TOOL} hover:text-negative`}
          >
            <X aria-hidden="true" />
          </Button>
        </>
      )}
    </li>
  );
}

const MOVE_DIRECTIONS = [
  { direction: "up", Icon: ArrowUp },
  { direction: "down", Icon: ArrowDown },
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
  const message = useMessage();
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
          notifyError(message(result.error));
          return;
        }
        refocus.current = true;
      } catch {
        notifyError(message(CHECKLIST_MOVE_FAILED));
      }
    });
  }

  return MOVE_DIRECTIONS.map(({ direction, Icon }) => (
    <Button
      key={direction}
      ref={(button: HTMLButtonElement | null) => {
        buttons.current[direction] = button;
      }}
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={direction === "up" ? isFirst : isLast}
      aria-busy={moving && pressed === direction}
      onClick={() => move(direction)}
      aria-label={`Move ${item.text} ${direction}`}
      className={ROW_TOOL}
    >
      {moving && pressed === direction ? (
        <PendingIndicator label="Moving…" />
      ) : (
        <Icon aria-hidden="true" />
      )}
    </Button>
  ));
}

/**
 * Adds a step on Enter, or renames one (Enter saves, Esc cancels). The
 * error line belongs to the field.
 */
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
  // A message key; turned into text below.
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const message = useMessage();

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
          } else notifyError(message(result.error));
          return;
        }
        setError("");
        notifyProcess(item ? "Step renamed" : "Step added");
        if (item) onClose?.();
        else {
          setText("");
          ref.current?.focus();
        }
      } catch {
        notifyError(message(CHECKLIST_SAVE_FAILED));
      }
    });
  }

  const label = item
    ? `Rename ${item.text}`
    : `New ${CHECKLIST_PHASE_LABELS[phase].toLowerCase()} step`;
  const shown = error || (full ? CHECKLIST_PHASE_FULL : "");
  const errorText = shown && message(shown);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-1"
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        ref={ref}
        id={id}
        value={text}
        readOnly={pending}
        autoComplete="off"
        enterKeyHint={item ? "done" : "enter"}
        placeholder={item ? undefined : "+ Add a step, press Enter"}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorText ? `${id}-error` : undefined}
        onKeyDown={(event) => {
          if (item && event.key === "Escape") {
            event.preventDefault();
            onClose?.();
          }
        }}
        onBlur={() => {
          if (item && !pending && text === item.text) onClose?.();
        }}
        onChange={(event) => {
          setText(event.target.value);
          const parsed = checklistItemSchema.shape.text.safeParse(
            event.target.value,
          );
          setError(parsed.success ? "" : parsed.error.issues[0].message);
        }}
        className={`h-10 lg:h-9 ${item ? "" : "border-dashed"}`}
      />
      <FieldError id={`${id}-error`} message={errorText} />
    </form>
  );
}
