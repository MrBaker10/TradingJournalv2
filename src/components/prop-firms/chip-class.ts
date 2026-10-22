// The Prop Firm Rules chip — size and tag filters and the card's size control
// (Design.md §4.28): 40px (§8), the §8 focus ring, colour and border changes
// at the §5 timing. Active and inactive differ only in colour.
const CHIP_BASE_CLASS =
  "h-10 rounded-xs border px-2.5 text-sm transition-colors duration-200 ease-[var(--ease-soft)] focus-visible:outline-2 focus-visible:outline-cyan focus-visible:outline-offset-2";

export function chipClass(active: boolean): string {
  return `${CHIP_BASE_CLASS} ${
    active
      ? "border-cyan/50 bg-cyan-dim text-cyan"
      : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
  }`;
}
