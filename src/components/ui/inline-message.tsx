interface InlineMessageProps {
  message: string | null;
}

// Design.md §4.5: the message line under a field exists from the start with
// min-height: 18px and only fades in/out — it is never inserted or removed,
// so nothing shifts when a message appears.
export function InlineMessage({ message }: InlineMessageProps) {
  return (
    <p
      className={`min-h-[18px] text-xs text-danger-fg transition-all duration-200 ${
        message ? "translate-y-0 opacity-100" : "-translate-y-[3px] opacity-0"
      }`}
    >
      {message ?? ""}
    </p>
  );
}
