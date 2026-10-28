"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScreenshotLightboxProps {
  url: string | null;
  onClose: () => void;
}

// A screenshot at full size over everything, the detail sheet included. A Base
// UI dialog, so it nests inside the sheet's: Esc closes the lightbox first and
// the sheet only with a second press, and focus returns to the thumbnail. A
// click on the dimmed backdrop closes it too; a click on the image does not.
export function ScreenshotLightbox({ url, onClose }: ScreenshotLightboxProps) {
  return (
    <DialogPrimitive.Root
      open={url !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[60] bg-black/85 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          aria-label="Screenshot"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          {url !== null && (
            // biome-ignore lint/performance/noImgElement: signed local-storage URL, not something next/image can optimize
            <img
              src={url}
              alt=""
              className="max-h-full max-w-full rounded-md object-contain"
            />
          )}
          <DialogPrimitive.Close
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                className="absolute top-3 right-3 size-10"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
