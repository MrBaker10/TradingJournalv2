export type Sign = "positive" | "negative" | "zero";

/** The sign of an amount, measured against `start` (zero unless given). */
export function signOf(cents: number, start = 0): Sign {
  if (cents > start) return "positive";
  if (cents < start) return "negative";
  return "zero";
}

/**
 * Money in its sign colour and nothing else (Design.md §1): one class per
 * sign for each place the dashboard paints one. Zero stays quiet.
 */
export const SIGN_TEXT: Record<Sign, string> = {
  positive: "text-positive",
  negative: "text-negative",
  zero: "text-muted-foreground",
};

/** The calendar day's tint: the same faint wash for every day of a sign. */
export const SIGN_TINT: Record<Sign, string> = {
  positive: "bg-positive/[0.07]",
  negative: "bg-negative/[0.07]",
  zero: "",
};

/** The calendar day's bottom bar. */
export const SIGN_BAR: Record<Sign, string> = {
  positive: "bg-positive/60",
  negative: "bg-negative/60",
  zero: "bg-muted-foreground/40",
};

/** Text colour for an amount that may be missing. */
export function moneyTone(cents: number | null): string {
  return cents === null ? SIGN_TEXT.zero : SIGN_TEXT[signOf(cents)];
}
