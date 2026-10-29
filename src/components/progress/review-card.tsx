import { ArrowRight, NotebookPen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * This week's review (Design.md §3.6): its state and the one action on the
 * page. "Write review" lifts 1 px with a soft process shadow and nudges its
 * arrow 2 px on hover, presses to 0.97; under reduced motion only the colour
 * changes. The transition names `translate` and `scale`, never `transform`.
 */
export function ReviewCard({
  reviewedThisWeek,
  reviewedRecently,
  recentWeekCount,
}: {
  reviewedThisWeek: boolean;
  /** Reviewed weeks before this one, inside the recent window. */
  reviewedRecently: number;
  recentWeekCount: number;
}) {
  return (
    <section
      aria-label="This week's review"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground"
    >
      <h2 className="flex items-center gap-2 text-sm">
        <NotebookPen
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        This week&apos;s review
      </h2>
      <p className="text-muted-foreground text-sm">
        {reviewedThisWeek
          ? "Written. It counts towards nothing but the habit."
          : "Three questions, five minutes. It counts towards nothing but the habit."}
      </p>
      <p className="text-muted-foreground text-xs">
        <span className="font-mono text-process tabular-nums">
          {reviewedRecently}
        </span>{" "}
        of the {recentWeekCount - 1} weeks before reviewed
      </p>
      <Link
        href="/progress/weekly-review"
        className={cn(
          buttonVariants(),
          "group mt-auto h-10 w-fit transition-[background-color,translate,scale,box-shadow] duration-150 hover:-translate-y-px hover:bg-primary/85 hover:shadow-[0_4px_14px_-4px_var(--process)] active:scale-[0.97] lg:h-8",
          "motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none motion-reduce:active:scale-100 motion-reduce:active:not-aria-[haspopup]:translate-y-0",
        )}
      >
        {reviewedThisWeek ? "Open review" : "Write review"}
        <ArrowRight
          aria-hidden="true"
          className="transition-[translate] duration-150 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
        />
      </Link>
    </section>
  );
}
