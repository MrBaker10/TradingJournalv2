export type InlineMessageTone = "error" | "hint" | "success";

interface InlineMessageProps {
  message: string | null;
  /** Design.md §4.6 allows intermediate steps: a short value is a neutral
   * hint, a good one a green confirmation. Errors stay the default. */
  tone?: InlineMessageTone;
}

const TONE_CLASS: Record<InlineMessageTone, string> = {
  error: "text-danger-fg",
  hint: "text-fg-muted",
  success: "text-success-fg",
};

// Design.md §4.5: the message line under a field exists from the start with
// min-height: 18px and only fades in/out — it is never inserted or removed,
// so nothing shifts when a message appears.
export function InlineMessage({ message, tone = "error" }: InlineMessageProps) {
  return (
    <p
      className={`min-h-[18px] text-xs transition-all duration-200 ${TONE_CLASS[tone]} ${
        message ? "translate-y-0 opacity-100" : "-translate-y-[3px] opacity-0"
      }`}
    >
      {message ?? ""}
    </p>
  );
}
