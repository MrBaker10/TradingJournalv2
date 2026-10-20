"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { saveWeeklyReview } from "@/actions/weekly-reviews";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { notifyError, notifyProcess } from "@/components/ui/toast";
import type { WeeklyReview } from "@/db/queries/weekly-reviews";
import {
  MAX_REVIEW_FIELD_LENGTH,
  WEEKLY_REVIEW_SAVE_FAILED,
} from "@/schemas/weekly-reviews";

interface WeeklyReviewFormProps {
  weekStart: string;
  review: WeeklyReview | null;
}

const SUCCESS_HOLD_MS = 1400;

// Same field recipe as the plan card (Design.md §4.5, §4.6).
const FIELD_CLASS =
  "w-full resize-none rounded-ctl border border-white/12 bg-well px-3 py-2 text-sm text-fg transition-colors duration-200 placeholder:text-fg-placeholder hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60";

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

// Design.md §4.26: process, so the card carries the neon edge like the plan
// card. Saving is explicit; a failed save is an error toast (notifyError), as
// coding-standards.md asks (decided 2026-10-20), and the text stays in the
// fields for the next try.
export function WeeklyReviewForm({ weekStart, review }: WeeklyReviewFormProps) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    whatWorked: review?.whatWorked ?? "",
    whatDidNotWork: review?.whatDidNotWork ?? "",
    focusNextWeek: review?.focusNextWeek ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || success) return;

    setLoading(true);
    // The action reports its own failures; this catches the call itself
    // failing (offline, server gone), which would otherwise leave the button
    // on "Saving…" for good — the same guard as the ledger's runWithToast.
    let result: Awaited<ReturnType<typeof saveWeeklyReview>>;
    try {
      result = await saveWeeklyReview({ weekStart, ...values });
    } catch {
      result = { success: false, error: WEEKLY_REVIEW_SAVE_FAILED };
    }
    setLoading(false);

    if (!result.success) {
      notifyError(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => setSuccess(false), SUCCESS_HOLD_MS);
    // A habit of its own: the toast names no score, because the weekly
    // review feeds none.
    notifyProcess("Weekly review saved");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-surface edge-neon flex flex-col gap-4 p-5"
    >
      <h2 className="cap cap-neon">Your review</h2>

      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <label htmlFor={field.id} className="cap">
            {field.label}
          </label>
          <textarea
            id={field.id}
            rows={4}
            maxLength={MAX_REVIEW_FIELD_LENGTH}
            value={values[field.key]}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.key]: event.target.value,
              }))
            }
            disabled={loading || success}
            placeholder={field.placeholder}
            className={FIELD_CLASS}
          />
        </div>
      ))}

      <div className="flex flex-col gap-1">
        <button
          type="submit"
          disabled={loading || success}
          // The plan card's button (Design.md §4.6, §4.14): calm idle surface,
          // the success gradient only to confirm the save.
          className={`relative h-11 w-full rounded-ctl text-sm font-medium text-fg ${
            success
              ? "bg-[image:var(--gradient-success)] shadow-[var(--shadow-button-primary)]"
              : "bg-[image:var(--gradient-info-soft)] shadow-[var(--shadow-info-soft)]"
          }`}
        >
          <span
            className={`inline-flex items-center justify-center transition-opacity duration-200 ease-linear ${
              loading || success ? "opacity-0" : "opacity-100"
            }`}
          >
            Save review
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
            Saved
          </span>
        </button>
      </div>
    </form>
  );
}
