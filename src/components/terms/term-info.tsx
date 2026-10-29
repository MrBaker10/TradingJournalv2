"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TERM_EXPLANATIONS, type TermKey } from "@/lib/terms";

/**
 * The info icon beside a term (Design.md §3.14): opens the term's explanation
 * by click, tap or Enter/Space, never on hover alone; Escape and an outside
 * click close it and focus returns to the icon. On the tooltip's surface.
 */
export function TermInfo({ term }: { term: TermKey }) {
  const { name, text } = TERM_EXPLANATIONS[term];
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={`About ${name}`}
        // A 16 px icon with a 40 px hit area (Design.md §5).
        className="relative inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-150 after:absolute after:-inset-3 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground"
      >
        <Info className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={6}
        collisionPadding={16}
        // Keys pressed in the explanation stay here: React bubbles them
        // through the portal, and the trade form reads Enter as "next".
        onKeyDown={(event) => event.stopPropagation()}
        className="w-auto max-w-xs gap-1 rounded-md bg-foreground px-3 py-2 text-background text-xs shadow-none ring-0"
      >
        <PopoverTitle className="font-semibold">{name}</PopoverTitle>
        <PopoverDescription className="text-background leading-relaxed">
          {text}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
