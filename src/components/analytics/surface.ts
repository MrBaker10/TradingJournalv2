// The two looks Analytics repeats (Design.md §3.7). A figure sits on a card;
// anything that opens the detail sheet answers the pointer with the accent
// surface and a 1 px lift (none under reduced motion) and shows a focus ring.

export const CARD_SURFACE = "rounded-xl border bg-card p-4";

export const OPENS_SHEET =
  "text-left outline-none transition-[background-color,translate] duration-150 hover:-translate-y-px hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0";
