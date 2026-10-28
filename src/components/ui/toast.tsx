"use client";

import { Check, CircleAlert } from "lucide-react";
import { Toaster as SonnerToaster, toast } from "sonner";

// Design.md §3.11: bottom right, stacked, 4200ms hold, in a polite live
// region. Never blocking, never centred, never with a button — a toast is a
// confirmation, not a decision, so there is nothing to click and nothing to
// dismiss by hand.
//
// `unstyled` turns off Sonner's own look; the markup below is ours. Sonner
// keeps what it is actually good at: stacking, timing out, pausing on hover,
// and the polite live region. Its enter and leave durations are set in
// globals.css, because Sonner injects its stylesheet at runtime.
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

/** The popover surface menus and sheets use; nothing glows (Design.md §1). */
const TOAST_SURFACE =
  "flex w-[320px] items-center gap-3 rounded-lg border bg-popover px-4 py-3 text-popover-foreground text-sm shadow-lg";
const TOAST_ICON =
  "flex size-[26px] shrink-0 items-center justify-center rounded-md";

/**
 * The confirmation toast. Design.md §3.11: the text names the action and its
 * **process** consequence, never money — "Plan saved · counts towards plan adherence",
 * never "Nice profit!". Field errors do not come through here; they stay
 * inline at the field they belong to.
 */
export function notifyProcess(message: string) {
  toast.custom(() => (
    <div className={TOAST_SURFACE}>
      <span className={`${TOAST_ICON} bg-process/15 text-process`}>
        <Check className="size-3.5" aria-hidden="true" />
      </span>
      <span>{message}</span>
    </div>
  ));
}

/**
 * A save that failed as a whole, where there is no field to put the message
 * at (Design.md §3.11). The same surface as `notifyProcess`; only the
 * tile says it went wrong, in the colour inline errors use. Sonner's own
 * `toast.error` would render unstyled here, because the viewport is.
 */
export function notifyError(message: string) {
  toast.custom(() => (
    <div role="alert" className={TOAST_SURFACE}>
      <span className={`${TOAST_ICON} bg-negative/15 text-negative`}>
        <CircleAlert className="size-3.5" aria-hidden="true" />
      </span>
      <span>{message}</span>
    </div>
  ));
}

/**
 * Runs a server action and reports it as a toast: the action's
 * own message when it refuses, `failed` when the request itself breaks, and
 * `success` when given — a form with its own saved state leaves it out.
 * Resolves to whether it succeeded, so the form decides what follows.
 */
export async function runWithToast(
  action: () => Promise<{ success: true } | { success: false; error: string }>,
  messages: { success?: string; failed: string },
): Promise<boolean> {
  try {
    const result = await action();
    if (!result.success) {
      notifyError(result.error);
      return false;
    }
    if (messages.success) notifyProcess(messages.success);
    return true;
  } catch {
    notifyError(messages.failed);
    return false;
  }
}
