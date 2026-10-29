// The native select in the look of the shadcn input, as the trade form has it
// (Design.md §3.5). Settings keeps native selects: their own keyboard handling
// is why ↑/↓ in the sheet leave a focused select alone.
export const SELECT_CLASS =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors duration-150 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-negative/70 dark:bg-input/30";

/** A part of the account editor or a settings row: its small heading. */
export const PART_HEADING = "font-semibold text-sm";

/** Help text under a field. */
export const HELP_TEXT = "text-muted-foreground text-xs leading-relaxed";
