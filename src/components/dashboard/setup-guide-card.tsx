import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  nextSetupGuideState,
  type SetupGuideView,
  type SetupStep,
  type SetupStepKey,
} from "@/domain/setup-guide";
import { cn } from "@/lib/utils";
import { SetupGuideCompletion } from "./setup-guide-completion";
import { SetupGuideHide } from "./setup-guide-hide";
import { SetupGuideQuestion } from "./setup-guide-question";

// Where each step is done. Step order and required/optional come from the
// domain rules; only wording and destination live here.
const STEP_LINKS: Record<SetupStepKey, { label: string; href: string }> = {
  account: { label: "Add an account", href: "/settings#accounts" },
  propFirm: { label: "Link a prop firm", href: "/prop-firms" },
  strategy: { label: "Create a trading strategy", href: "/strategies" },
  checklist: {
    label: "Set up a checklist template",
    href: "/settings#checklist",
  },
  entry: { label: "Log a first trade or missed setup", href: "/journal/new" },
};

/**
 * The setup guide at the top of the dashboard (Design.md §3.2): the question,
 * then the step list, then its completion once. It explains where things are and never comments on
 * results. The page renders it only when the rules show something.
 */
export function SetupGuideCard({
  view,
}: {
  view: Exclude<SetupGuideView, { kind: "hidden" }>;
}) {
  const card = (
    <section
      aria-labelledby="setup-guide-heading"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground"
    >
      <div className="flex items-center gap-3">
        <h2
          id="setup-guide-heading"
          className="text-[11px] text-muted-foreground uppercase tracking-wider"
        >
          Setup guide
        </h2>
        {nextSetupGuideState(view, "hide") !== null && <SetupGuideHide />}
      </div>
      {view.kind === "question" ? (
        <>
          <p className="font-medium">Want a short setup guide?</p>
          <SetupGuideQuestion />
        </>
      ) : (
        // The completion is the same list with every required step ticked,
        // shown while the sweep plays.
        <ol className="flex flex-col">
          {view.steps.map((step) => (
            <SetupStepRow key={step.key} step={step} />
          ))}
        </ol>
      )}
    </section>
  );
  // The card brings its own space below, so the completion can fold it away
  // together with the gap.
  if (view.kind === "completion")
    return <SetupGuideCompletion>{card}</SetupGuideCompletion>;
  return <div className="pb-6">{card}</div>;
}

function SetupStepRow({ step }: { step: SetupStep }) {
  const { label, href } = STEP_LINKS[step.key];
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-10 items-center gap-2.5 rounded-md px-1.5 py-1 text-sm outline-none transition-colors duration-150 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:min-h-8"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
            step.done
              ? "border-foreground bg-foreground text-background"
              : "border-input",
          )}
        >
          {step.done && <Check className="size-3" strokeWidth={3} />}
        </span>
        <span>{label}</span>
        <span className="sr-only">{step.done ? ", done," : ", open,"}</span>{" "}
        <span className="ml-auto text-muted-foreground text-xs">
          {step.required ? "Required" : "Optional"}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 text-muted-foreground transition-[translate] duration-150 group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}
