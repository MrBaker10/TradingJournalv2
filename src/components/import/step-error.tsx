import { FieldError } from "@/components/trades/form-blocks";

/**
 * A step's error line, where the import has always shown it. The slot is
 * there from the start and announces what appears in it, so nothing shifts
 * and a screen reader hears the error.
 */
export function StepError({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="min-h-4">
      <FieldError message={message ?? undefined} />
    </div>
  );
}
