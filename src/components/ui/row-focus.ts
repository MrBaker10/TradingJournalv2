/**
 * The dense table's keyboard navigation (Design.md §3.4): ↑/↓ move the focus
 * from row to row; Enter on a row's button opens it, as any button does.
 * Bound on the table or its body, so it never fights a field. A row's opener
 * carries `data-row`.
 */
export function moveRowFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button[data-row]",
    ),
  ];
  const current = buttons.findIndex((button) => button === event.target);
  if (current === -1) return;
  const next = current + (event.key === "ArrowDown" ? 1 : -1);
  if (next < 0 || next >= buttons.length) return;
  event.preventDefault();
  buttons[next].focus();
}
