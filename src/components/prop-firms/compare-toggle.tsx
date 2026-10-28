"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/toggle";
import {
  buildPropFirmsHref,
  MAX_COMPARE,
  type PropFirmsState,
  toggleCompare,
} from "@/lib/prop-firms/href";

/**
 * Puts a program into the compare selection in the URL or takes it out. Off,
 * on, and full: disabled at three unless it is one of them.
 */
export function CompareToggle({
  state,
  programId,
  label,
}: {
  state: PropFirmsState;
  programId: number;
  /** "Firm · Program", so the toggle names what it compares. */
  label: string;
}) {
  const router = useRouter();
  const selected = state.compare.includes(programId);
  const full = state.compare.length >= MAX_COMPARE;

  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={selected}
      disabled={full && !selected}
      aria-label={`Compare ${label}`}
      title={full && !selected ? "Three at a time" : undefined}
      onPressedChange={() =>
        router.push(
          buildPropFirmsHref(state, {
            compare: toggleCompare(state.compare, programId),
          }),
          { scroll: false },
        )
      }
      className="h-10 shrink-0 font-normal text-muted-foreground aria-pressed:text-foreground lg:h-7"
    >
      {selected && <Check aria-hidden="true" />}
      {selected ? "In compare" : "Compare"}
    </Toggle>
  );
}
