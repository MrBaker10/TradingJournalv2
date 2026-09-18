// The one bar in this app, and the one place that decides how a bar is
// coloured.
//
// Design.md §1 is the whole rule and it is enforced here rather than restated
// in every caller: a **process** value gets the neon fill, a **money** value
// gets a semantic colour and nothing else — no gradient, no glow, no
// celebration on a winning bucket.
//
// It came out of score-breakdown.tsx when the analytics dimension tables
// needed the same bar. Three copies of the width-class array would have meant
// three places where that colour rule could quietly drift apart.

export type ValueBarTone = "process" | "gain" | "loss";

interface ValueBarProps {
  /** 0–1. Clamped, so a caller cannot draw past the track. */
  ratio: number;
  tone: ValueBarTone;
  /** `sm` for a table row, `md` for a card. Default `sm`. */
  size?: "sm" | "md";
}

// Twenty-one static width classes rather than one inline style: "no inline
// styles" is a hard rule in coding-standards.md, and Tailwind only emits
// classes it can actually see in the source. Five-percent steps are
// indistinguishable at these heights, and the exact number always stands next
// to the bar as text.
const FILL_WIDTHS = [
  "w-[0%]",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-[100%]",
];

const FILLS: Record<ValueBarTone, string> = {
  process: "bg-[image:var(--gradient-info)]",
  gain: "bg-success",
  loss: "bg-danger",
};

export function ValueBar({ ratio, tone, size = "sm" }: ValueBarProps) {
  const step = Math.round(Math.min(Math.max(ratio, 0), 1) * 20);

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-bar-track ${
        size === "md" ? "h-1.5" : "h-[3px]"
      }`}
      // The exact value always sits next to the bar as text; announcing the
      // bar as well would only repeat it.
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full ${FILLS[tone]} ${FILL_WIDTHS[step]}`}
      />
    </div>
  );
}
