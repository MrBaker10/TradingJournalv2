"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { saveWeeklyReview } from "@/actions/weekly-reviews";
import { FieldLabel } from "@/components/trades/form-blocks";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { Textarea } from "@/components/ui/textarea";
import { runWithToast } from "@/components/ui/toast";
import type { WeeklyReview } from "@/db/queries/weekly-reviews";
import { cn } from "@/lib/utils";
import {
  MAX_REVIEW_FIELD_LENGTH,
  WEEKLY_REVIEW_SAVE_FAILED,
} from "@/schemas/weekly-reviews";

interface WeeklyReviewFormProps {
  weekStart: string;
  review: WeeklyReview | null;
}

/** How long the button shows "Saved" before it returns (Design.md §3.11). */
const SAVED_HOLD_MS = 1500;

const FIELDS = [
  {
    key: "whatWorked",
    id: "weekly-what-worked",
    label: "What worked",
    placeholder: "The setups, habits and calls you want to keep.",
  },
  {
    key: "whatDidNotWork",
    id: "weekly-what-did-not-work",
    label: "What did not work",
    placeholder:
      "The mistake that kept coming back, the session that went wrong.",
  },
  {
    key: "focusNextWeek",
    id: "weekly-focus-next-week",
    label: "Focus next week",
    placeholder: "One intention you can check yourself against on Friday.",
  },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

/**
 * The review's three answers as the form blocks of Design.md §3.5, on one
 * page. Every field is optional; the action checks the week and the length.
 * Saving confirms the action — "Review saved" — on the button and as a toast;
 * a failed save is an error toast and the text stays in the fields.
 */
export function WeeklyReviewForm({ weekStart, review }: WeeklyReviewFormProps) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    whatWorked: review?.whatWorked ?? "",
    whatDidNotWork: review?.whatDidNotWork ?? "",
    focusNextWeek: review?.focusNextWeek ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  function save() {
    if (isPending || saved) return;
    startTransition(async () => {
      const ok = await runWithToast(
        () => saveWeeklyReview({ weekStart, ...values }),
        { success: "Review saved", failed: WEEKLY_REVIEW_SAVE_FAILED },
      );
      if (ok) setSaved(true);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      aria-label="Your review"
      className="flex flex-col gap-4"
    >
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
          <Textarea
            id={field.id}
            rows={4}
            maxLength={MAX_REVIEW_FIELD_LENGTH}
            value={values[field.key]}
            placeholder={field.placeholder}
            disabled={isPending}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                [field.key]: event.target.value,
              }));
              setSaved(false);
            }}
            className="min-h-24"
          />
        </div>
      ))}

      <Button
        type="submit"
        size="lg"
        disabled={isPending || saved}
        // Pending and saved are states of the button, not "unavailable".
        className={cn(
          "h-10 min-w-36 self-start px-4",
          (isPending || saved) && "disabled:opacity-100",
        )}
      >
        {isPending ? (
          <PendingIndicator label="Saving…" />
        ) : saved ? (
          <>
            <Check aria-hidden="true" />
            Saved
          </>
        ) : (
          "Save review"
        )}
      </Button>
    </form>
  );
}
