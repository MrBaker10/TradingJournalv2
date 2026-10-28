"use client";

import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { saveDailyNote } from "@/actions/daily-notes";
import { Button } from "@/components/ui/button";
import {
  InlineMessage,
  type InlineMessageTone,
} from "@/components/ui/inline-message";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { Textarea } from "@/components/ui/textarea";
import { notifyProcess } from "@/components/ui/toast";
import { PLAN_HINT_LENGTH } from "@/schemas/daily-notes";

interface PlanCardProps {
  premarketPlan: string | null;
  eodReview: string | null;
}

const SUCCESS_HOLD_MS = 1400;
/** Room for the review field as it grows with its text; it scrolls beyond. */
const REVIEW_MAX_HEIGHT = 480;

const EMPTY_PLAN_MESSAGE =
  "Write your levels first — this is what plan adherence checks against.";

// Live feedback while typing, with an intermediate
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

// The plan card in the dashboard's right column (Design.md §3.2). The review
// is a disclosure inside the same card, never a second screen, and an error
// appears at the field it belongs to — no modal.
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

    // "Plan saved" and "day reviewed" are two triggers; this card writes both
    // in one go, so it raises one toast that says which of
    // them happened. The text names the process consequence, never money.
    notifyProcess(
      review.trim().length > 0
        ? "Plan and review saved · both count towards consistency"
        : "Plan saved · counts towards plan adherence",
    );
  }

  const feedback = planFeedback(plan, planError);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="text-[11px] text-muted-foreground uppercase tracking-wider">
        Plan today&apos;s session
      </h2>
      <p className="text-muted-foreground text-xs">
        Write the plan before the session, review it after. Both count towards
        this month&apos;s consistency score — never towards P&amp;L.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="premarket-plan" className="text-sm">
          Pre-market plan
        </label>
        <Textarea
          id="premarket-plan"
          ref={planRef}
          rows={4}
          value={plan}
          onChange={(event) => {
            setPlan(event.target.value);
            if (planError) setPlanError(null);
          }}
          disabled={loading || success}
          aria-invalid={planError !== null}
          placeholder="Levels, bias, what you'll take and what you'll leave alone."
          className="resize-none"
        />
        <InlineMessage message={feedback.message} tone={feedback.tone} />
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setReviewOpen((open) => !open)}
          aria-expanded={reviewOpen}
          aria-controls="eod-review-panel"
          className="flex h-10 items-center gap-1.5 self-start rounded-md text-foreground/80 text-sm outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-8"
        >
          <ChevronDown
            className={`size-4 transition-[rotate] duration-150 ${
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
              // max-height, not height: only opacity, translate, scale,
              // shadow, max-height and colour move (coding-standards Motion).
              initial={{ maxHeight: 0, opacity: 0 }}
              animate={{ maxHeight: REVIEW_MAX_HEIGHT, opacity: 1 }}
              exit={{ maxHeight: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-1 pt-1">
                <label htmlFor="eod-review" className="text-sm">
                  End-of-day review
                </label>
                <Textarea
                  id="eod-review"
                  rows={4}
                  value={review}
                  onChange={(event) => setReview(event.target.value)}
                  disabled={loading || success}
                  placeholder="What you followed, what you broke, what you'd repeat."
                  className="resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-1">
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={loading || success}
          className="w-full disabled:opacity-100"
        >
          {loading ? (
            <PendingIndicator label="Saving…" />
          ) : success ? (
            <>
              <Check aria-hidden="true" />
              Saved
            </>
          ) : (
            "Save plan"
          )}
        </Button>
        <InlineMessage message={formError} />
      </div>
    </form>
  );
}
