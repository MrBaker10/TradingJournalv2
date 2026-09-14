"use client";

import { Check } from "lucide-react";
import { Toaster as SonnerToaster, toast } from "sonner";

// Design.md §4.11: bottom right, stacked, gap 10px, real blur allowed here,
// 4200ms hold. Never blocking, never centred, never with a button — a toast is
// a confirmation, not a decision, so there is nothing to click and nothing to
// dismiss by hand.
//
// `unstyled` turns off Sonner's own look; the markup below is ours. Sonner
// keeps what it is actually good at: stacking, timing out, pausing on hover,
// and the polite live region. The two transition durations §4.11 asks for are
// set in globals.css, because Sonner injects its stylesheet at runtime.
export function ToastViewport() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={10}
      duration={TOAST_HOLD_MS}
      toastOptions={{ unstyled: true }}
    />
  );
}

const TOAST_HOLD_MS = 4200;

/**
 * The only toast this app raises. Design.md §6: the text names the **process**
 * consequence, never money — "Plan saved · counts towards plan adherence",
 * never "Nice profit!". Errors do not come through here; they stay inline at
 * the field they belong to.
 */
export function notifyProcess(message: string) {
  toast.custom(() => (
    <div className="flex w-[320px] items-center gap-3 rounded-ctl bg-[image:var(--gradient-inset)] px-4 py-3 shadow-[var(--shadow-toast)] backdrop-blur-xl">
      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-xs bg-[image:var(--gradient-info)] text-fg">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="text-fg text-sm">{message}</span>
    </div>
  ));
}
