"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { saveDailyNote } from "@/actions/daily-notes";
import {
  InlineMessage,
  type InlineMessageTone,
} from "@/components/ui/inline-message";
import { PLAN_HINT_LENGTH } from "@/schemas/daily-notes";

interface PlanCardProps {
  premarketPlan: string | null;
  eodReview: string | null;
}

const SUCCESS_HOLD_MS = 1400;

const EMPTY_PLAN_MESSAGE =
  "Write your levels first — this is what plan adherence checks against.";

// Design.md §4.6 and §7: live feedback while typing, with an intermediate
// step. Too short is a neutral hint, not an error — it still saves.
function planFeedback(
  plan: string,
  error: string | null,
): { message: string | null; tone: InlineMessageTone } {
  if (error) return { message: error, tone: "error" };
  if (plan.trim().length === 0) return { message: null, tone: "hint" };
  if (plan.trim().length < PLAN_HINT_LENGTH) {
    return {
      message: "A bit more — levels and bias, not just a word.",
      tone: "hint",
    };
  }
  return {
    message: "Reads like a plan you can be held to",
    tone: "success",
  };
}

const FIELD_CLASS =
  "w-full resize-none rounded-ctl border border-white/12 bg-well px-3 py-2 text-sm text-fg transition-colors duration-200 placeholder:text-fg-placeholder hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60";

// Design.md §4.6: the card is process, so it carries the neon edge. The
// review is a disclosure inside the same card, never a second screen, and an
// error appears at the field it belongs to — no modal, no toast.
export function PlanCard({ premarketPlan, eodReview }: PlanCardProps) {
  const [plan, setPlan] = useState(premarketPlan ?? "");
  const [review, setReview] = useState(eodReview ?? "");
  const [reviewOpen, setReviewOpen] = useState((eodReview ?? "") !== "");
  const [planError, setPlanError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const planRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || success) return;

    if (plan.trim().length === 0) {
      setPlanError(EMPTY_PLAN_MESSAGE);
      planRef.current?.focus();
      return;
    }

    setPlanError(null);
    setFormError(null);
    setLoading(true);
    const result = await saveDailyNote({
      premarketPlan: plan,
      eodReview: review,
    });
    setLoading(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => setSuccess(false), SUCCESS_HOLD_MS);
  }

  const feedback = planFeedback(plan, planError);

  return (
    <form
      onSubmit={handleSubmit}
      className="card-surface edge-neon flex flex-col gap-3 p-5"
    >
      <h2 className="cap cap-neon">Plan today&apos;s session</h2>
      <p className="text-fg-muted text-sm">
        Write the plan before the session, review it after. Both count towards
        this month&apos;s consistency score — never towards P&amp;L.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="premarket-plan" className="cap">
          Pre-market plan
        </label>
        <textarea
          id="premarket-plan"
          ref={planRef}
          rows={4}
          value={plan}
          onChange={(event) => {
            setPlan(event.target.value);
            if (planError) setPlanError(null);
          }}
          disabled={loading || success}
          placeholder="Levels, bias, what you'll take and what you'll leave alone."
          className={FIELD_CLASS}
        />
        <InlineMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setReviewOpen((open) => !open)}
          aria-expanded={reviewOpen}
          aria-controls="eod-review-panel"
          className="flex h-10 items-center gap-1.5 self-start text-fg-muted text-sm transition-colors hover:text-fg"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${
              reviewOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
          Add end-of-day review
        </button>

        <AnimatePresence initial={false}>
          {reviewOpen && (
            <motion.div
              id="eod-review-panel"
              key="review"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-1 pt-1">
                <label htmlFor="eod-review" className="cap">
                  End-of-day review
                </label>
                <textarea
                  id="eod-review"
                  rows={4}
                  value={review}
                  onChange={(event) => setReview(event.target.value)}
                  disabled={loading || success}
                  placeholder="What you followed, what you broke, what you'd repeat."
                  className={FIELD_CLASS}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
            Save plan
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-linear ${
              loading ? "opacity-100" : "opacity-0"
            }`}
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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
        <InlineMessage message={formError} />
      </div>
    </form>
  );
}
