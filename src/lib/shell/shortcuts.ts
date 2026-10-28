/** What a shell key press asks for (Design.md §3.1 → Keys). */
export type ShellShortcut = "toggleSidebar" | "logTrade" | "togglePalette";

/** The part of a `KeyboardEvent` the shortcuts read. */
export interface ShortcutKey {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

const FIELD_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role=dialog], dialog";

/**
 * Whether a key event comes from somewhere the trader types or a dialog owns
 * the keys. The target can be `window` or `document`, which have no `closest`.
 */
export function isFieldTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(FIELD_SELECTOR) !== null;
}

/**
 * The shell action a key press asks for, or null. `[` toggles the sidebar, `C`
 * logs a trade, ⌘K (Ctrl+K off macOS) toggles the command palette. Nothing
 * fires from a field (`inField`, see `isFieldTarget`), and `C` and `[` with a
 * modifier stay the browser's, so Ctrl+C still copies.
 */
export function shellShortcut(
  event: ShortcutKey,
  inField: boolean,
): ShellShortcut | null {
  if (inField) return null;
  if ((event.metaKey || event.ctrlKey) && !event.altKey) {
    return event.key.toLowerCase() === "k" ? "togglePalette" : null;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.key === "[") return "toggleSidebar";
  if (event.key.toLowerCase() === "c") return "logTrade";
  return null;
}
