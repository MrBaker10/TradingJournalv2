"use client";

import { useEffect, useEffectEvent } from "react";

/**
 * ⌘V anywhere on the page hands pasted images to `onImages` while `enabled`
 * (the trade form's Evidence step, Design.md §3.5). A paste without an image,
 * such as a link pasted into a field, is left alone.
 */
export function usePasteImages(
  enabled: boolean,
  onImages: (files: File[]) => void,
) {
  const handle = useEffectEvent(onImages);

  useEffect(() => {
    if (!enabled) return;
    function onPaste(event: ClipboardEvent) {
      const images = [...(event.clipboardData?.files ?? [])].filter((file) =>
        file.type.startsWith("image/"),
      );
      if (images.length === 0) return;
      event.preventDefault();
      handle(images);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enabled]);
}
