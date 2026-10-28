export type InlineMessageTone = "error" | "hint" | "success";

interface InlineMessageProps {
  message: string | null;
  /** A short value earns a neutral hint, a good one a confirmation in the
   * process colour (Design.md §1: green and red belong to money). Errors stay
   * the default. */
  tone?: InlineMessageTone;
}

const TONE_CLASS: Record<InlineMessageTone, string> = {
  error: "text-negative",
  hint: "text-muted-foreground",
  success: "text-process",
};

// The message line under a field (Design.md §3.11) exists from the start with
// min-height: 18px and only fades in/out — it is never inserted or removed,
// so nothing shifts when a message appears.
export function InlineMessage({ message, tone = "error" }: InlineMessageProps) {
  return (
    <p
      className={`min-h-[18px] text-xs transition-all duration-150 ${TONE_CLASS[tone]} ${
        message ? "translate-y-0 opacity-100" : "-translate-y-[3px] opacity-0"
      }`}
    >
      {message ?? ""}
    </p>
  );
}
